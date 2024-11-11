const validator = require("validator");

exports.validateSignup = (req, res, next) => {
    const { firstName, lastName, email, password, phone, address } = req.body;
    const errors = {};

    
    if (!firstName?.trim()) {
        errors.firstName = "First name is required";
    }
    
    if (!lastName?.trim()) {
        errors.lastName = "Last name is required";
    }
    
    if (!email || !validator.isEmail(email)) {
        errors.email = "Valid email is required";
    }
    
    
    if (!password || password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        errors.password = "Password must be at least 8 characters and contain both letters and numbers";
    }
    
    
    if (!phone || !phone.match(/^\d{11}$/)) {
        errors.phone = "Phone number must be 11 digits";
    }
    
    if (!address?.trim()) {
      errors.address = "Address is required";
  }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

exports.validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = {};

    if (!email || !validator.isEmail(email)) {
        errors.email = "Valid email is required";
    }

    if (!password) {
        errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};