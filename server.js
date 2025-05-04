require("dotenv").config();
const express = require("express");
const connectDB = require("./db");
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listings");
const cartRoutes = require("./routes/cartRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const ownerRatingRoutes = require("./routes/ownerRatingRoutes");
const orderRoutes = require("./routes/orderRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const PORT = process.env.PORT || 3000;

app.use(express.json());

connectDB();

app.use(
  cors({
    origin: "http://127.0.0.1:5500",
    credentials: true,
  })
);

app.use("/api", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api", cartRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/owner-ratings", ownerRatingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err, req, res, next) => {
  console.error("ERROR DETAILS:");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  if (err.name === 'ValidationError') {
    console.error("Validation Error Details:", JSON.stringify(err.errors, null, 2));
  }
  res.status(500).json({ message: "Internal server error", error: err.message });
});

process.on("SIGINT", async () => {
  console.log("Server shutting down...");
  await mongoose.connection.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
