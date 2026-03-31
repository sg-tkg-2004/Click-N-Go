const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { createAvailability, getProviderAvailabilities } = require('../controllers/availabilities.controller');

router.post('/', verifyToken, createAvailability);
router.get('/:provider_id', getProviderAvailabilities);

module.exports = router;
