
const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController');
const { validateSignup, validateLogin } = require('../middleware/validator.middleware');
const { loginLimiter } = require('../middleware/rateLimiter.middleware');
const { verifyToken } = require('../middleware/auth.middleware');

router.post('/signup', validateSignup, userController.signup);
router.post('/login', loginLimiter, validateLogin, userController.login);


router.get('/profile', verifyToken, (req, res) => {
    res.json({ message: 'Protected route', userId: req.user.userId });
});

module.exports = router;