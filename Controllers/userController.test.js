const User = require('../Models/userModel');
const bcrypt = require('bcrypt');
const validator = require('validator');


exports.signup = async (req, res) => {
    try {
        
        const { firstName, lastName, email, password, phone, birthDate } = req.body;

        
        if (!firstName || !lastName || !email || !password || !phone || !birthDate) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }

        
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password must be at least 6 characters, include uppercase, lowercase, a digit, and a special character.' });
        }

        
        const phoneRegex = /^[0-9]{10,15}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: 'Invalid phone number format. Only digits allowed.' });
        }

        
        if (!validator.isDate(birthDate) || new Date(birthDate) >= new Date()) {
            return res.status(400).json({ message: 'Invalid birth date. Please enter a valid date in the past.' });
        }

        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        
        const hashedPassword = await bcrypt.hash(password, 10);

        
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            phone,
            birthDate,
        });

        
        await newUser.save();

        
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};