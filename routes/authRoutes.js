// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Define the signup route
router.post('/signup', userController.signup);

module.exports = router;
