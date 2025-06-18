const User = require('../Models/userModel');
const PendingUser = require('../Models/PendingUser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetCode, sendVerificationCode } = require('../config/emailService');

const SALT_ROUNDS = 10;

// Step 1: Request verification code (doesn't create user account yet)
exports.requestVerificationCode = async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone, address } = req.body;

        // Validate email format
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        // Additional validation for required fields
        if (!firstName || !lastName || !password || !address) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Check if email already exists in main User collection
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash password for temporary storage
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Remove any existing pending user with this email
        await PendingUser.findOneAndDelete({ email: email.toLowerCase() });

        // Create pending user
        const pendingUser = new PendingUser({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase(),
            password: hashedPassword,
            phoneNumber: phone,
            address: address.trim(),
            verificationCode: verificationCode,
            verificationExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
            attempts: 0
        });

        await pendingUser.save();

        // Send verification code email
        const emailResult = await sendVerificationCode(pendingUser.email, verificationCode, pendingUser.firstName);
        
        if (!emailResult.success) {
            // If email sending fails, delete the pending user
            await PendingUser.findByIdAndDelete(pendingUser._id);
            console.error('Failed to send verification code:', emailResult.error);
            return res.status(400).json({ 
                message: 'Failed to send verification code. Please check your email address and try again.' 
            });
        }

        res.status(200).json({
            message: 'Verification code has been sent to your email. Please enter the code to complete registration.',
            email: pendingUser.email,
            expiresIn: '10 minutes',
            // Only include these in development/testing
            ...(process.env.NODE_ENV !== 'production' && { 
                verificationCode: verificationCode,
                debug: 'Verification code included for testing - will be removed in production'
            })
        });
    } catch (error) {
        console.error('Request verification code error:', error);
        res.status(500).json({ message: 'Failed to send verification code' });
    }
};

// Step 2: Verify code and create actual user account
exports.verifyCodeAndSignup = async (req, res) => {
    try {
        const { email, verificationCode } = req.body;
        
        if (!email || !verificationCode) {
            return res.status(400).json({ message: 'Email and verification code are required' });
        }

        // Find pending user
        const pendingUser = await PendingUser.findOne({ 
            email: email.toLowerCase(),
            verificationExpires: { $gt: Date.now() }
        });

        if (!pendingUser) {
            return res.status(400).json({ 
                message: 'Verification code expired or email not found. Please request a new code.' 
            });
        }

        // Check attempts limit
        if (pendingUser.attempts >= 5) {
            await PendingUser.findByIdAndDelete(pendingUser._id);
            return res.status(400).json({ 
                message: 'Too many failed attempts. Please start the signup process again.' 
            });
        }

        // Verify code
        if (pendingUser.verificationCode !== verificationCode.toString()) {
            // Increment attempts
            pendingUser.attempts += 1;
            await pendingUser.save();
            
            return res.status(400).json({ 
                message: `Invalid verification code. ${5 - pendingUser.attempts} attempts remaining.` 
            });
        }

        // Code is correct, create the actual user account
        const username = pendingUser.email.split('@')[0];

        const newUser = new User({
            firstName: pendingUser.firstName,
            lastName: pendingUser.lastName,
            email: pendingUser.email,
            password: pendingUser.password, // Already hashed
            phoneNumber: pendingUser.phoneNumber,
            username: username,
            address: pendingUser.address,
            isEmailVerified: true // Email is verified since they entered the code
        });

        await newUser.save();

        // Delete the pending user
        await PendingUser.findByIdAndDelete(pendingUser._id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser._id, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log successful signup
        console.log(`User successfully registered and verified: ${newUser.email} at ${new Date().toISOString()}`);

        res.status(201).json({
            message: 'Email verified successfully! Your account has been created.',
            token,
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('Verify code and signup error:', error);
        res.status(500).json({ message: 'Failed to verify code and create account' });
    }
};

// Resend verification code
exports.resendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find pending user
        const pendingUser = await PendingUser.findOne({ email: email.toLowerCase() });
        if (!pendingUser) {
            return res.status(404).json({ message: 'No pending registration found for this email' });
        }

        // Generate new verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Update pending user with new code and expiry
        pendingUser.verificationCode = verificationCode;
        pendingUser.verificationExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        pendingUser.attempts = 0; // Reset attempts
        
        await pendingUser.save();

        // Send new verification code
        const emailResult = await sendVerificationCode(pendingUser.email, verificationCode, pendingUser.firstName);
        
        if (!emailResult.success) {
            console.error('Failed to resend verification code:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to send verification code. Please try again later.' 
            });
        }

        res.status(200).json({
            message: 'New verification code has been sent to your email.',
            expiresIn: '10 minutes',
            // Only include these in development/testing
            ...(process.env.NODE_ENV !== 'production' && { 
                verificationCode: verificationCode,
                debug: 'Verification code included for testing - will be removed in production'
            })
        });
    } catch (error) {
        console.error('Resend verification code error:', error);
        res.status(500).json({ message: 'Failed to resend verification code' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token with user role
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Login failed' });
    }
};

// Request password reset code
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please enter a valid email address' });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // For security reasons, we still return a success message even if the email doesn't exist
            return res.status(200).json({ 
                message: 'If your email is registered, you will receive a password reset code within a few minutes' 
            });
        }

        // Generate a 6-digit reset code
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store the code directly (no need to hash since it's temporary and short-lived)
        user.resetPasswordToken = resetCode;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        
        await user.save();

        // Send password reset code email
        const emailResult = await sendPasswordResetCode(user.email, resetCode);
        
        if (!emailResult.success) {
            // If email sending fails, clean up the code from database
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            console.error('Failed to send reset code:', emailResult.error);
            return res.status(500).json({ 
                message: 'Failed to send password reset code. Please try again later.' 
            });
        }

        res.status(200).json({
            message: 'Password reset code has been sent to your email. Please check your inbox and spam folder.',
            expiresIn: '15 minutes',
            // Only include these in development/testing
            ...(process.env.NODE_ENV !== 'production' && { 
                resetCode: resetCode,
                debug: 'Reset code included for testing - will be removed in production'
            })
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Failed to process password reset request' });
    }
};

// Reset password with code
exports.resetPassword = async (req, res) => {
    try {
        const { email, resetCode, newPassword } = req.body;
        
        if (!email || !resetCode || !newPassword) {
            return res.status(400).json({ message: 'Email, reset code, and new password are required' });
        }

        // Validate password strength
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        // Find user with the code and check if code is still valid
        const user = await User.findOne({
            email: email.toLowerCase(),
            resetPasswordToken: resetCode.toString(),
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ 
                message: 'Invalid or expired reset code. Please request a new password reset code.' 
            });
        }

        // Check if the new password is different from the current one
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ 
                message: 'New password must be different from your current password' 
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        
        // Update user's password and clear reset code fields
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        await user.save();

        // Log successful password reset (for security monitoring)
        console.log(`Password reset successful for user: ${user.email} at ${new Date().toISOString()}`);

        res.status(200).json({ 
            message: 'Password has been reset successfully. You can now login with your new password.' 
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Failed to reset password. Please try again.' });
    }
};

