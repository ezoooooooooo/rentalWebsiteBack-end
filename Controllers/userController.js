// controllers/userController.js
const User = require('../Models/userModel');
const bcrypt = require('bcrypt');

// Signup function
exports.signup = async (req, res) => {
    try {
        // Extract user details from the request body
        const { firstName, lastName, email, password, phone, birthDate } = req.body;

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
