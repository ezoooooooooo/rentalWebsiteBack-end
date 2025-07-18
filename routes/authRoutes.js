const express = require('express');
const router = express.Router();
const userController = require('../Controllers/userController');
const { validateSignup, validateLogin } = require('../middleware/validator.middleware');
const { loginLimiter } = require('../middleware/rateLimiter.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const User = require('../Models/userModel'); // Adjust path based on your project structure


// New signup process with verification code
router.post('/request-verification', validateSignup, userController.requestVerificationCode);
router.post('/verify-signup', userController.verifyCodeAndSignup);
router.post('/resend-code', userController.resendVerificationCode);

router.post('/login', loginLimiter, validateLogin, userController.login);

// Password reset routes
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);


router.get('/profile', verifyToken, async (req, res) => {
    try {
        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Return user profile data including firstName
        res.json({
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            address: user.address,
            phoneNumber: user.phoneNumber
            // You can add or remove fields based on what your frontend needs
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;