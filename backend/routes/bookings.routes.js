const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  createBooking,
  requestReschedule,
  rejectReschedule,
  approveReschedule,
  getMyBookings
} = require('../controllers/bookings.controller');

router.post('/', verifyToken, createBooking);
router.get('/my', verifyToken, getMyBookings);
router.post('/:id/reschedule', verifyToken, requestReschedule);
router.post('/:id/reschedule/approve', verifyToken, approveReschedule);
router.post('/:id/reschedule/reject', verifyToken, rejectReschedule);

module.exports = router;
