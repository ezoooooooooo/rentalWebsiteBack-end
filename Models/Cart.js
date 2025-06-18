// models/Cart.js
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [
    {
      listing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true
      },
      rentalDays: {
        type: Number,
        required: true,
        default: 1,
        min: 1
      }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);