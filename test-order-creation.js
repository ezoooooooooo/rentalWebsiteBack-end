require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./Models/Order");
const connectDB = require("./db");

// Test direct order creation
const testOrderCreation = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log("Connected to database");

    // Sample order data
    const orderData = {
      user: "67c72e10e8e456a95ca60bff", // Use a valid user ID from your database
      listing: "67ba3cf2219e8753f3c85e27", // Use a valid listing ID from your database
      owner: "67c72e10e8e456a95ca60bff", // Use a valid owner ID from your database
      startDate: new Date("2024-04-20"),
      endDate: new Date("2024-04-25"),
      rentalDays: 5,
      totalPrice: 100, // Explicitly set a total price
      status: "pending",
      paymentStatus: "completed",
      isActive: true
    };

    console.log("Creating order with data:", orderData);

    // Create the order directly
    const order = new Order(orderData);
    
    // Log the order object before saving
    console.log("Order object before save:", order);
    
    // Save the order
    const savedOrder = await order.save();
    console.log("Order created successfully:", savedOrder);

    // Close the database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error creating order:", error);
    
    // Log validation errors in detail
    if (error.name === 'ValidationError') {
      console.error("Validation Error Details:", JSON.stringify(error.errors, null, 2));
    }
    
    // Close the database connection
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
};

// Run the test
testOrderCreation();
