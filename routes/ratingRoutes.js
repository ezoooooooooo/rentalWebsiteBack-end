const express = require("express");
const router = express.Router();
const ratingController = require("../Controllers/ratingController");
const { verifyToken } = require("../middleware/auth.middleware");

// POST /api/ratings - Add a new rating
router.post("/", verifyToken, ratingController.addRating);

// GET /api/ratings/listing/:listingId - Get all ratings for a listing
router.get("/listing/:listingId", ratingController.getListingRatings);

// PUT /api/ratings/:ratingId - Update a rating
router.put("/:ratingId", verifyToken, ratingController.updateRating);

// DELETE /api/ratings/:ratingId - Delete a rating
router.delete("/:ratingId", verifyToken, ratingController.deleteRating);

module.exports = router;
