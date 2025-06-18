const express = require("express");
const router = express.Router();
const ownerRatingController = require("../Controllers/ownerRatingController");
const { verifyToken } = require("../middleware/auth.middleware");

// POST /api/owner-ratings - Add a new owner rating
router.post("/", verifyToken, ownerRatingController.addOwnerRating);

// GET /api/owner-ratings/owner/:ownerId - Get all ratings for an owner
router.get("/owner/:ownerId", ownerRatingController.getOwnerRatings);

// PUT /api/owner-ratings/:ratingId - Update an owner rating
router.put("/:ratingId", verifyToken, ownerRatingController.updateOwnerRating);

// DELETE /api/owner-ratings/:ratingId - Delete an owner rating
router.delete(
  "/:ratingId",
  verifyToken,
  ownerRatingController.deleteOwnerRating
);

module.exports = router;
