const User = require('../Models/userModel');
const bcrypt = require('bcrypt');
const validator = require('validator');  // Validator package for validation functions

// Signup function
exports.signup = async (req, res) => {
    try {
        // Extract user details from the request body
        const { firstName, lastName, email, password, phone, birthDate } = req.body;

        // Check if all required fields are provided
        if (!firstName || !lastName || !email || !password || !phone || !birthDate) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        // Validate password complexity (6+ characters, at least one uppercase letter, one lowercase letter, one digit, one special character)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters, include uppercase, lowercase, a digit, and a special character.' });
        }

        // Validate phone number format (digits only, between 10 and 15 digits)
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: 'Invalid phone number format. Only digits allowed.' });
        }

        // Validate birthDate is in the past
        if (!validator.isDate(birthDate) || new Date(birthDate) >= new Date()) {
            return res.status(400).json({ message: 'Invalid birth date. Please enter a valid date in the past.' });
        }

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            birthDate,
        });

        // Save the user to the database
        await newUser.save();

        // Send a success response
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
