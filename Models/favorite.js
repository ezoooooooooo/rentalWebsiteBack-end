// models/favorite.js
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    listing: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Listing', 
        required: true 
    }
}, { timestamps: true });

// Compound index to ensure a user can favorite a listing only once
favoriteSchema.index({ user: 1, listing: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);