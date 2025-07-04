const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  rentalDays: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    default: function() {
      // For existing orders, calculate subtotal from totalPrice if not provided
      if (this.totalPrice && !this.subtotal) {
        return Math.round(this.totalPrice / 1.2); // Remove 20% fees to get base price
      }
      return this.totalPrice || 0;
    },
  },
  platformFee: {
    type: Number,
    default: function() {
      // For existing orders, calculate platform fee if not provided
      if (this.subtotal) {
        return Math.round(this.subtotal * 0.1);
      } else if (this.totalPrice) {
        return Math.round((this.totalPrice / 1.2) * 0.1);
      }
      return 0;
    },
  },
  insuranceFee: {
    type: Number,
    default: function() {
      // For existing orders, calculate insurance fee if not provided
      if (this.subtotal) {
        return Math.round(this.subtotal * 0.1);
      } else if (this.totalPrice) {
        return Math.round((this.totalPrice / 1.2) * 0.1);
      }
      return Math.round(this.totalPrice * 0.1); // Fallback to old calculation
    },
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "completed", "cancelled"],
    default: "pending",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add a method to check if the rental period is still active
orderSchema.methods.isRentalActive = function () {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
};

module.exports = mongoose.model("Order", orderSchema);
