const pool = require('../config/db');
const { pickForwardChainFromLockedRows } = require('../utils/bookingSlots');

const BASE_SLOT = 15;

// CREATE BOOKING (STRICT START TIME + MULTI SLOT)
const createBooking = async (req, res, next) => {
  const client = await pool.connect();

  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can book services' });
    }

    const { provider_id, service_id, start_time, availability_id } = req.body;

    if (!provider_id || !service_id || (!start_time && !availability_id)) {
      return res.status(400).json({
        error: 'provider_id, service_id and either start_time or availability_id are required'
      });
    }

    let resolvedStartTime = start_time;

    if (!resolvedStartTime && availability_id) {
      const availabilityRes = await client.query(
        `SELECT start_time FROM _availabilities WHERE id = $1 AND is_deleted = false`,
        [availability_id]
      );
      if (availabilityRes.rows.length === 0) {
        return res.status(404).json({ error: 'Selected availability not found' });
      }
      resolvedStartTime = availabilityRes.rows[0].start_time;
    }

    const start = new Date(resolvedStartTime);

    if (isNaN(start)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // 🔒 2 months restriction
    const now = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);

    if (start < now || start > maxDate) {
      return res.status(400).json({
        error: 'Booking must be within next 2 months'
      });
    }

    // ✅ 1. Validate service
    const serviceRes = await client.query(
      `SELECT id, provider_id, duration_minutes FROM _services WHERE id = $1`,
      [service_id]
    );

    if (serviceRes.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (serviceRes.rows[0].provider_id !== provider_id) {
      return res.status(400).json({ error: 'Invalid provider for this service' });
    }

    const duration = serviceRes.rows[0].duration_minutes;

    if (duration % BASE_SLOT !== 0) {
      return res.status(400).json({
        error: 'Service duration must be multiple of 15'
      });
    }

    const slotsNeeded = duration / BASE_SLOT;

    await client.query('BEGIN');

    // ✅ 2. Fetch + LOCK slots
    // Match schema: _availabilities.is_booked + bookings row locks (incl. reschedule target + lock_expires_at)
    const expectedWindowEnd = new Date(start.getTime() + duration * 60000);
    // Window: only slot *starts* in [selected_start, selected_start + duration).
    // Example: 8:30 PM + 30 min → rows starting 8:30 and 8:45 only; 7:45 PM is excluded (start < selected).
    const slotsRes = await client.query(
      `SELECT a.* FROM _availabilities a
       WHERE a.provider_id = $1
       AND a.start_time >= $2::timestamptz
       AND a.start_time < $3::timestamptz
       AND a.is_deleted = false
       AND a.is_booked = false
       AND NOT EXISTS (
         SELECT 1 FROM _bookings b
         WHERE b.is_deleted = false
           AND b.status IN ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'RESCHEDULED')
           AND (b.lock_expires_at IS NULL OR b.lock_expires_at > NOW())
           AND (b.availability_id = a.id OR b.target_availability_id = a.id)
       )
       ORDER BY a.start_time ASC
       FOR UPDATE`,
      [provider_id, start, expectedWindowEnd]
    );

    const startMs = start.getTime();
    const windowEndMs = expectedWindowEnd.getTime();

    // Defense in depth: never pass rows that start before the selected instant into chain logic
    // (guards against any driver/query edge case; SQL already enforces start_time >= $2).
    const slots = slotsRes.rows.filter((s) => {
      const t = new Date(s.start_time).getTime();
      return t >= startMs && t < windowEndMs;
    });

    if (slots.length === 0) {
      throw new Error('No slots available');
    }

    // Root-cause fix: do NOT use slots[0] as the chain anchor. Older code assumed the first
    // row in the result was the selected slot; if any row before selected_start appeared in the
    // array, the chain could incorrectly include 7:45 + 8:30 + 8:45 for a 30-min booking.
    // pickForwardChainFromLockedRows finds the row whose start_time === selected_start, then
    // takes exactly slotsNeeded consecutive rows forward (end_time === next.start_time).
    const selectedSlots = pickForwardChainFromLockedRows(slots, start, slotsNeeded);

    // 🔥 5. Call DB function with first slot
    const firstSlotId = selectedSlots[0].id;

    const result = await client.query(
      `SELECT create_safe_booking($1, $2, $3, $4) AS booking_id`,
      [req.user.id, provider_id, service_id, firstSlotId]
    );

    const bookingId = result.rows[0].booking_id;

    if (!bookingId) {
      throw new Error('Slot already booked or locked');
    }

    // 🔥 6. Mark all slots as booked
    const slotIds = selectedSlots.map(s => s.id);

    await client.query(
      `UPDATE _availabilities
       SET is_booked = true
       WHERE id = ANY($1)`,
      [slotIds]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Booking successful',
      booking_id: bookingId,
      slots_used: selectedSlots.length
    });

  } catch (error) {
    await client.query('ROLLBACK');

    console.error(' Booking Error:', error.message);

    res.status(400).json({
      error: error.message || 'Booking failed'
    });

  } finally {
    client.release();
  }
};


// REQUEST RESCHEDULE
const requestReschedule = async (req, res, next) => {
  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can request reschedule' });
    }

    const { id: booking_id } = req.params;
    const { target_availability_id } = req.body;

    if (!booking_id || !target_availability_id) {
      return res.status(400).json({
        error: 'booking_id and target_availability_id are required'
      });
    }

    const bookingResult = await pool.query(
      `SELECT customer_id, provider_id, availability_id, status 
       FROM _bookings WHERE id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({
        error: `Cannot reschedule booking with status ${booking.status}`
      });
    }

    if (booking.availability_id === target_availability_id) {
      return res.status(400).json({
        error: 'New slot must be different'
      });
    }

    const availabilityCheck = await pool.query(
      `SELECT id, provider_id FROM _availabilities WHERE id = $1`,
      [target_availability_id]
    );

    if (availabilityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Target slot not found' });
    }

    if (availabilityCheck.rows[0].provider_id !== booking.provider_id) {
      return res.status(400).json({
        error: 'Slot must belong to same provider'
      });
    }

    const result = await pool.query(
      `SELECT request_safe_reschedule($1, $2) AS success`,
      [booking_id, target_availability_id]
    );

    if (!result.rows[0].success) {
      return res.status(409).json({
        error: 'Slot unavailable or locked'
      });
    }

    res.status(200).json({
      message: 'Reschedule requested (valid for 24h)'
    });

  } catch (error) {
    console.error('🔥 Reschedule Error:', error.message);
    next(error);
  }
};


// APPROVE RESCHEDULE (TRANSACTION SAFE)
const approveReschedule = async (req, res, next) => {
  const client = await pool.connect();

  try {
    if (req.user.role !== 'PROVIDER') {
      return res.status(403).json({ error: 'Only provider can approve' });
    }

    const { id: booking_id } = req.params;

    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT provider_id, target_availability_id, status, lock_expires_at 
       FROM _bookings WHERE id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.provider_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (booking.status !== 'RESCHEDULE_REQUESTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No pending reschedule request' });
    }

    //  Expiry check
    if (booking.lock_expires_at && new Date(booking.lock_expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reschedule request expired' });
    }

    const result = await client.query(
      `UPDATE _bookings
       SET availability_id = target_availability_id,
           target_availability_id = NULL,
           status = 'RESCHEDULED',
           lock_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [booking_id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Reschedule approved',
      booking: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');

    // 🔥 Handle DB constraint error
    if (error.code === 'P0001') {
      return res.status(409).json({ error: 'Slot conflict detected' });
    }

    console.error('🔥 Approve Error:', error.message);
    next(error);

  } finally {
    client.release();
  }
};


// REJECT RESCHEDULE
const rejectReschedule = async (req, res, next) => {
  try {
    if (req.user.role !== 'PROVIDER') {
      return res.status(403).json({ error: 'Only provider can reject' });
    }

    const { id: booking_id } = req.params;

    const bookingResult = await pool.query(
      `SELECT provider_id, status 
       FROM _bookings WHERE id = $1`,
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookingResult.rows[0];

    if (booking.provider_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (booking.status !== 'RESCHEDULE_REQUESTED') {
      return res.status(400).json({ error: 'No reschedule request' });
    }

    const result = await pool.query(
      `UPDATE _bookings
       SET target_availability_id = NULL,
           status = 'CONFIRMED',
           lock_expires_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [booking_id]
    );

    res.status(200).json({
      message: 'Reschedule rejected',
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('🔥 Reject Error:', error.message);
    next(error);
  }
};

// @desc    Get booking history for current user
// @route   GET /api/bookings/my
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const isProvider = req.user.role === 'PROVIDER';
    const actorField = isProvider ? 'b.provider_id' : 'b.customer_id';

    const result = await pool.query(
      `SELECT b.id, b.status, b.created_at,
              s.id AS service_id, s.title AS service_title, s.price, s.duration_minutes,
              a.start_time, a.end_time,
              cu.id AS customer_id, cu.name AS customer_name,
              pu.id AS provider_id, pu.name AS provider_name
       FROM _bookings b
       JOIN _services s ON s.id = b.service_id
       JOIN _availabilities a ON a.id = b.availability_id
       JOIN _users cu ON cu.id = b.customer_id
       JOIN _users pu ON pu.id = b.provider_id
       WHERE ${actorField} = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};


module.exports = { createBooking, requestReschedule, approveReschedule, rejectReschedule, getMyBookings };