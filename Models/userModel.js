const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String },
    birthDate: { type: Date },
    username: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String
    },
    canListItems: { type: Boolean, default: true },
    canRentItems: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);