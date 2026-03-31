const pool = require('../config/db');

const BASE_SLOT = 15;

// CREATE BOOKING (STRICT START TIME + MULTI SLOT)
const createBooking = async (req, res, next) => {
  const client = await pool.connect();

  try {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({ error: 'Only customers can book services' });
    }

    const { provider_id, service_id, start_time } = req.body;

    if (!provider_id || !service_id || !start_time) {
      return res.status(400).json({
        error: 'provider_id, service_id, start_time are required'
      });
    }

    const start = new Date(start_time);

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
      `SELECT id, provider_id, duration_minutes FROM services WHERE id = $1`,
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
    const slotsRes = await client.query(
      `SELECT * FROM _availabilities
       WHERE provider_id = $1
       AND start_time >= $2
       AND is_deleted = false
       AND is_booked = false
       ORDER BY start_time ASC
       FOR UPDATE`,
      [provider_id, start]
    );

    const slots = slotsRes.rows;

    if (slots.length === 0) {
      throw new Error('No slots available');
    }

    // 🔥 3. STRICT: find EXACT start_time index
    const startIndex = slots.findIndex(
      s => new Date(s.start_time).getTime() === start.getTime()
    );

    if (startIndex === -1) {
      throw new Error('Selected time slot is not available');
    }

    // 🔥 4. Build slots ONLY from selected start_time
    let selectedSlots = [];

    for (let j = 0; j < slotsNeeded; j++) {
      const current = slots[startIndex + j];
      const prev = selectedSlots[j - 1];

      if (!current) {
        throw new Error('Not enough slots available');
      }

      // first slot
      if (j === 0) {
        selectedSlots.push(current);
        continue;
      }

      // continuity check
      if (
        new Date(prev.end_time).getTime() ===
        new Date(current.start_time).getTime()
      ) {
        selectedSlots.push(current);
      } else {
        throw new Error('Selected time is not fully available');
      }
    }

    if (selectedSlots.length !== slotsNeeded) {
      throw new Error('Not enough continuous slots available');
    }

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

    console.error('🔥 Booking Error:', error.message);

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
       FROM bookings WHERE id = $1`,
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
       FROM bookings WHERE id = $1`,
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

    // 🔥 Expiry check
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
       FROM bookings WHERE id = $1`,
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


module.exports = {createBooking,requestReschedule,approveReschedule,rejectReschedule};