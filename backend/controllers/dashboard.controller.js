const pool = require('../config/db');

const getMyDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const [profileRes, bookingStatsRes, upcomingRes, pendingReviewsRes, providerServicesRes] = await Promise.all([
      pool.query(`SELECT id, name, email, phone, role, created_at FROM _users WHERE id = $1`, [userId]),
      pool.query(
        `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
          COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled,
          COUNT(*) FILTER (WHERE status IN ('PENDING','CONFIRMED','RESCHEDULE_REQUESTED','RESCHEDULED'))::int AS active
         FROM _bookings
         WHERE customer_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT b.id, b.status, s.title AS service_title, pu.name AS provider_name, a.start_time
         FROM _bookings b
         JOIN _services s ON s.id = b.service_id
         JOIN _users pu ON pu.id = b.provider_id
         JOIN _availabilities a ON a.id = b.availability_id
         WHERE b.customer_id = $1
           AND a.start_time > NOW()
         ORDER BY a.start_time ASC
         LIMIT 5`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS pending_reviews
         FROM _bookings b
         LEFT JOIN _reviews r ON r.booking_id = b.id
         WHERE b.customer_id = $1
           AND b.status = 'COMPLETED'
           AND r.id IS NULL`,
        [userId]
      ),
      role === 'PROVIDER'
        ? pool.query(`SELECT COUNT(*)::int AS services_count FROM _services WHERE provider_id = $1`, [userId])
        : Promise.resolve({ rows: [{ services_count: 0 }] })
    ]);

    res.status(200).json({
      profile: profileRes.rows[0] || null,
      bookingSummary: bookingStatsRes.rows[0] || { total: 0, completed: 0, cancelled: 0, active: 0 },
      upcomingBookings: upcomingRes.rows || [],
      pendingReviews: pendingReviewsRes.rows[0]?.pending_reviews || 0,
      providerSummary: providerServicesRes.rows[0] || { services_count: 0 }
    });
  } catch (error) {
    next(error);
  }
};

const getProviderDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== 'PROVIDER') {
      return res.status(403).json({ error: 'Only providers can access provider dashboard' });
    }
    const providerId = req.user.id;
    const result = await pool.query(
      `SELECT
         COUNT(b.id)::int AS total_bookings,
         COUNT(*) FILTER (WHERE b.status = 'COMPLETED')::int AS completed_bookings,
         COUNT(*) FILTER (WHERE b.status IN ('PENDING','CONFIRMED','RESCHEDULE_REQUESTED','RESCHEDULED'))::int AS pending_bookings,
         COALESCE(SUM(CASE WHEN b.status = 'COMPLETED' THEN s.price ELSE 0 END), 0)::numeric(12,2) AS total_revenue,
         (SELECT COUNT(*)::int FROM _services ss WHERE ss.provider_id = $1) AS total_services_offered
       FROM _services s
       LEFT JOIN _bookings b ON b.service_id = s.id
       WHERE s.provider_id = $1`,
      [providerId]
    );

    const row = result.rows[0] || {};
    res.status(200).json({
      totalBookings: Number(row.total_bookings || 0),
      completedBookings: Number(row.completed_bookings || 0),
      pendingBookings: Number(row.pending_bookings || 0),
      totalRevenue: Number(row.total_revenue || 0),
      totalServicesOffered: Number(row.total_services_offered || 0),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyDashboard, getProviderDashboard };
