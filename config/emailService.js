const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
    // Gmail configuration (you can change this to other email providers)
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Your email address
            pass: process.env.EMAIL_PASS  // Your app password (not regular password)
        }
    });
};

// Send verification code email
const sendVerificationCode = async (email, verificationCode, firstName) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Your Verification Code - Rental Website',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; text-align: center; }
                        .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; color: #333; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                        .warning { background-color: #e8f5e8; border: 1px solid #4CAF50; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to Rental Website!</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${firstName}!</h2>
                            <p>Thank you for signing up! Please enter this verification code to complete your registration:</p>
                            
                            <div class="code">${verificationCode}</div>
                            
                            <div class="warning">
                                <strong>📧 Important:</strong>
                                <ul style="text-align: left;">
                                    <li>This code will expire in 10 minutes</li>
                                    <li>Enter this code on the signup page to complete registration</li>
                                    <li>If you didn't request this, please ignore this email</li>
                                </ul>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This email was sent by Rental Website</p>
                            <p>If you have any questions, please contact our support team</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const result = await transporter.sendMail(mailOptions);
  
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending verification code:', error);
        return { success: false, error: error.message };
    }
};

// Send password reset code email
const sendPasswordResetCode = async (email, resetCode) => {
    try {
        const transporter = createTransporter();
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Code - Rental Website',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                        .content { padding: 20px; background-color: #f9f9f9; text-align: center; }
                        .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; background-color: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; color: #333; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                        .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Password Reset Code</h1>
                        </div>
                        <div class="content">
                            <h2>Hello!</h2>
                            <p>You have requested to reset your password for your Rental Website account.</p>
                            <p>Please use this code to reset your password:</p>
                            
                            <div class="code">${resetCode}</div>
                            
                            <p>Go to the password reset page on our website and enter this code along with your new password.</p>
                            
                            <div class="warning">
                                <strong>⚠️ Important:</strong>
                                <ul style="text-align: left;">
                                    <li>This code will expire in 15 minutes</li>
                                    <li>If you didn't request this reset, please ignore this email</li>
                                    <li>Don't share this code with anyone</li>
                                </ul>
                            </div>
                        </div>
                        <div class="footer">
                            <p>This email was sent by Rental Website</p>
                            <p>If you have any questions, please contact our support team</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        const result = await transporter.sendMail(mailOptions);
  
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending password reset code:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendVerificationCode,
    sendPasswordResetCode
}; 