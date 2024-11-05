// middleware/validator.middleware.js
const validator = require('validator');

exports.validateSignup = (req, res, next) => {
    const { firstName, lastName, email, password, phone, birthDate } = req.body;
    const errors = {};

    if (!firstName?.trim()) errors.firstName = 'First name is required';
    if (!lastName?.trim()) errors.lastName = 'Last name is required';
    if (!email || !validator.isEmail(email)) errors.email = 'Valid email is required';
    if (!password || !validator.isStrongPassword(password)) {
        errors.password = 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character';
    }
    if (!phone || !validator.isMobilePhone(phone)) errors.phone = 'Valid phone number is required';
    if (!birthDate || !validator.isDate(birthDate)) errors.birthDate = 'Valid birth date is required';

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

exports.validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = {};

    if (!email || !validator.isEmail(email)) errors.email = 'Valid email is required';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};