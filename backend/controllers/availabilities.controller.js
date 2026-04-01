const pool = require('../config/db');

const BASE_SLOT = 15;

// CREATE AVAILABILITY (AUTO RECURRING FOR 2 MONTHS)
const createAvailability = async (req, res, next) => {
  try {
    if (req.user.role !== 'PROVIDER') {
      return res.status(403).json({
        error: 'Only providers can create availabilities'
      });
    }

    const { start_time, end_time } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({
        error: 'start_time and end_time are required'
      });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({
        error: 'Invalid date format'
      });
    }

    if (start >= end) {
      return res.status(400).json({
        error: 'end_time must be greater than start_time'
      });
    }

    const now = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);

    if (start < now) {
      return res.status(400).json({
        error: 'Cannot create availability in the past'
      });
    }

    //  Extract TIME only (important)
    const startHours = start.getHours();
    const startMinutes = start.getMinutes();

    const endHours = end.getHours();
    const endMinutes = end.getMinutes();

    const allSlots = [];

    //  Loop for 2 months (day by day)
    let currentDate = new Date(start);

    while (currentDate <= maxDate) {

      // Create day-specific start & end
      let dayStart = new Date(currentDate);
      dayStart.setHours(startHours, startMinutes, 0, 0);

      let dayEnd = new Date(currentDate);
      dayEnd.setHours(endHours, endMinutes, 0, 0);

      // Skip past times for today
      if (dayStart < now) {
        dayStart = new Date(now);
      }

      let current = new Date(dayStart);

      //  Generate slots for that day
      while (true) {
        const slotEnd = new Date(current.getTime() + BASE_SLOT * 60000);

        if (slotEnd.getTime() > dayEnd.getTime()) break;

        allSlots.push([
          req.user.id,
          new Date(current),
          new Date(slotEnd),
          false
        ]);

        current = slotEnd;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (allSlots.length === 0) {
      return res.status(400).json({
        error: 'No slots generated'
      });
    }

    console.log(` Total slots generated: ${allSlots.length}`);

    //  Bulk insert
    const values = [];
    const params = [];
    let idx = 1;

    allSlots.forEach(slot => {
      values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3})`);
      params.push(...slot);
      idx += 4;
    });

    // No ON CONFLICT: exclusion constraint (overlapping ranges) raises 23P01; caught below
    const query = `
      INSERT INTO _availabilities (provider_id, start_time, end_time, is_deleted)
      VALUES ${values.join(',')}
      RETURNING id
    `;

    const result = await pool.query(query, params);

    res.status(201).json({
      message: 'Availability created for next 2 months',
      total_slots_created: result.rowCount
    });

  } catch (error) {

    if (error.code === '23P01') {
      return res.status(409).json({
        error: 'Some slots overlap existing ones'
      });
    }

    console.error(' Availability Error:', error.message);
    next(error);
  }
};



// @desc    Get provider availability
// @route   GET /api/availabilities/:provider_id
// @access  Public
const getProviderAvailabilities = async (req, res, next) => {
  try {
    const { provider_id } = req.params;

    // is_booked column is authoritative for multi-slot consumption; OR EXISTS covers legacy rows
    const result = await pool.query(
      `SELECT a.id, a.start_time, a.end_time,
              (a.is_booked OR EXISTS (
                SELECT 1 FROM _bookings b
                WHERE b.availability_id = a.id
                  AND b.is_deleted = false
                  AND b.status IN ('PENDING', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'RESCHEDULED')
                  AND (b.lock_expires_at IS NULL OR b.lock_expires_at > NOW())
              )) AS is_booked
       FROM _availabilities a
       WHERE a.provider_id = $1
       AND a.is_deleted = false
       AND a.start_time > NOW()
       ORDER BY a.start_time ASC`,
      [provider_id]
    );

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('🔥 Fetch Availability Error:', error.message);
    next(error);
  }
};


module.exports = {
  createAvailability,
  getProviderAvailabilities
};