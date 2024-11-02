// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController');

// Define the signup route
router.post('/signup', userController.signup);

module.exports = router;
