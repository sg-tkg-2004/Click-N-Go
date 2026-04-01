const pool = require('../config/db');

const createReview = async (req, res, next) => {
  try {
    const { booking_id, rating, comment } = req.body;
    const score = Number(rating);

    if (!booking_id || !Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'booking_id and rating (1-5) are required' });
    }

    const bookingRes = await pool.query(
      `SELECT id, customer_id, provider_id, service_id, status
       FROM _bookings
       WHERE id = $1`,
      [booking_id]
    );
    if (!bookingRes.rows.length) return res.status(404).json({ error: 'Booking not found' });

    const booking = bookingRes.rows[0];
    if (booking.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to review this booking' });
    }
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Only completed bookings can be reviewed' });
    }

    const inserted = await pool.query(
      `INSERT INTO _reviews (booking_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, booking_id, user_id, rating, comment, created_at`,
      [booking_id, req.user.id, score, comment || null]
    );

    res.status(201).json({ message: 'Review submitted', review: inserted.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Review already exists for this booking' });
    }
    next(error);
  }
};

const getServiceReviews = async (req, res, next) => {
  try {
    const { serviceId } = req.params;
    const result = await pool.query(
      `SELECT r.id, r.booking_id, r.user_id, r.rating, r.comment, r.created_at,
              u.name AS reviewer_name
       FROM _reviews r
       JOIN _bookings b ON b.id = r.booking_id
       JOIN _users u ON u.id = r.user_id
       WHERE b.service_id = $1
       ORDER BY r.created_at DESC`,
      [serviceId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

const getMyPendingReviews = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.id AS booking_id, b.service_id, s.title AS service_title,
              a.start_time, a.end_time, pu.name AS provider_name
       FROM _bookings b
       JOIN _services s ON s.id = b.service_id
       JOIN _availabilities a ON a.id = b.availability_id
       JOIN _users pu ON pu.id = b.provider_id
       LEFT JOIN _reviews r ON r.booking_id = b.id
       WHERE b.customer_id = $1
         AND b.status = 'COMPLETED'
         AND r.id IS NULL
       ORDER BY a.end_time ASC`,
      [req.user.id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = { createReview, getServiceReviews, getMyPendingReviews };
