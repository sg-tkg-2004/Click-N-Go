const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { createBooking, requestReschedule,rejectReschedule,approveReschedule } = require('../controllers/bookings.controller');

router.post('/', verifyToken, createBooking);
router.post('/:id/reschedule', verifyToken, requestReschedule,rejectReschedule,approveReschedule);

module.exports = router;
