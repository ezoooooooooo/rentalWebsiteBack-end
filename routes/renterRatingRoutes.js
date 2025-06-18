const express = require("express");
const router = express.Router();
const renterRatingController = require("../Controllers/renterRatingController");
const { verifyToken } = require("../middleware/auth.middleware");

// POST /api/renter-ratings - Add a new renter rating
router.post("/", verifyToken, renterRatingController.addRenterRating);

// GET /api/renter-ratings/renter/:renterId - Get all ratings for a renter
router.get("/renter/:renterId", renterRatingController.getRenterRatings);

// PUT /api/renter-ratings/:ratingId - Update a renter rating
router.put("/:ratingId", verifyToken, renterRatingController.updateRenterRating);

// DELETE /api/renter-ratings/:ratingId - Delete a renter rating
router.delete("/:ratingId", verifyToken, renterRatingController.deleteRenterRating);

module.exports = router; 