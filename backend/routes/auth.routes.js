const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { registerUser, loginUser, getMe } = require('../controllers/auth.controller');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', verifyToken, getMe);

module.exports = router;
