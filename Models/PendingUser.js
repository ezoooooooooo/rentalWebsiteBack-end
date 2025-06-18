const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String },
    password: { type: String, required: true }, // Already hashed
    address: { type: String, required: true },
    verificationCode: { type: String, required: true },
    verificationExpires: { type: Date, required: true },
    attempts: { type: Number, default: 0, max: 5 } // Limit verification attempts
  },
  { 
    timestamps: true,
    // Auto-delete documents after expiry
    expireAfterSeconds: 0,
    index: { verificationExpires: 1 }
  }
);

// Index for auto-deletion based on expiration
pendingUserSchema.index({ verificationExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingUser", pendingUserSchema); 