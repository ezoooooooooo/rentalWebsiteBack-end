const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String },
    birthDate: { type: Date },
    username: { type: String, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    address: { type: String, required: true },
    // Password reset fields
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    // Email verification fields
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    emailVerificationExpires: { type: Date },
    // Owner rating statistics
    ownerRating: { type: Number, default: 0 },
    ownerRatingCount: { type: Number, default: 0 },
    communicationRating: { type: Number, default: 0 },
    reliabilityRating: { type: Number, default: 0 },
    itemConditionRating: { type: Number, default: 0 },
    // Renter rating statistics
    renterRating: { type: Number, default: 0 },
    renterRatingCount: { type: Number, default: 0 },
    renterCommunicationRating: { type: Number, default: 0 },
    renterReliabilityRating: { type: Number, default: 0 },
    renterItemCareRating: { type: Number, default: 0 },
    renterTimelinessRating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
