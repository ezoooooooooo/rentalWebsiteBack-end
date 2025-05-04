// Test script for rating systems
require("dotenv").config();
const axios = require("axios");

// Base URL for API
const API_URL = "http://localhost:3000/api";

// Test user credentials - replace with valid credentials from your system
const TEST_USER = {
  email: "ezooooooo@gmail.com",
  password: "Asd1234567#",
};

// IDs for testing - replace these with actual IDs from your database
const TEST_LISTING_ID = "67ba3cf2219e8753f3c85e27"; // Replace with a real listing ID
const TEST_OWNER_ID = "6799085e524069d5b7c615f9"; // Replace with a real owner ID

// Store auth token
let authToken = "";

// Helper to make authorized requests
const authorizedRequest = async (method, endpoint, data = null) => {
  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  try {
    let response;
    if (method === "GET") {
      response = await axios.get(`${API_URL}${endpoint}`, config);
    } else if (method === "POST") {
      response = await axios.post(`${API_URL}${endpoint}`, data, config);
    } else if (method === "PUT") {
      response = await axios.put(`${API_URL}${endpoint}`, data, config);
    } else if (method === "DELETE") {
      response = await axios.delete(`${API_URL}${endpoint}`, config);
    }

    return response.data;
  } catch (error) {
    console.error(
      `Error making ${method} request to ${endpoint}:`,
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

// Login function
const login = async () => {
  try {
    // The correct login endpoint from your authRoutes.js
    const response = await axios.post(`${API_URL}/login`, TEST_USER);

    // Extract token from response
    authToken = response.data.token;
    console.log("Login successful");
    return response.data;
  } catch (error) {
    console.error(
      "Login failed:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

// Test item rating endpoints
const testItemRatings = async () => {
  console.log("\n--- TESTING ITEM RATING SYSTEM ---");

  try {
    // 1. Create a rating
    console.log("\n1. Creating an item rating");
    const newRating = await authorizedRequest("POST", "/ratings", {
      listingId: TEST_LISTING_ID,
      score: 4,
      comment: "This item was in great condition and exactly as described!",
    });
    console.log("Rating created:", newRating);

    // Store rating ID for later tests
    const ratingId = newRating.data._id;

    // 2. Get all ratings for a listing
    console.log("\n2. Getting all ratings for the listing");
    const listingRatings = await authorizedRequest(
      "GET",
      `/ratings/listing/${TEST_LISTING_ID}`
    );
    console.log(`Found ${listingRatings.count} ratings for listing`);

    // 3. Update the rating
    console.log("\n3. Updating the rating");
    const updatedRating = await authorizedRequest(
      "PUT",
      `/ratings/${ratingId}`,
      {
        score: 5,
        comment:
          "Updated: This item exceeded my expectations! Perfect condition.",
      }
    );
    console.log("Rating updated:", updatedRating);

    // 4. Delete the rating
    console.log("\n4. Deleting the rating");
    const deleteResult = await authorizedRequest(
      "DELETE",
      `/ratings/${ratingId}`
    );
    console.log("Rating deleted:", deleteResult);

    console.log("\nItem rating tests completed successfully");
  } catch (error) {
    console.error("Error testing item ratings:", error);
  }
};

// Test owner rating endpoints
const testOwnerRatings = async () => {
  console.log("\n--- TESTING OWNER RATING SYSTEM ---");

  try {
    // 1. Create an owner rating
    console.log("\n1. Creating an owner rating");
    const newRating = await authorizedRequest("POST", "/owner-ratings", {
      ownerId: TEST_OWNER_ID,
      score: 4,
      comment: "Great owner, very responsive!",
      communication: 5,
      reliability: 4,
      itemCondition: 4,
    });
    console.log("Owner rating created:", newRating);

    // Store rating ID for later tests
    const ratingId = newRating.data._id;

    // 2. Get all ratings for an owner
    console.log("\n2. Getting all ratings for the owner");
    const ownerRatings = await authorizedRequest(
      "GET",
      `/owner-ratings/owner/${TEST_OWNER_ID}`
    );
    console.log(`Found ${ownerRatings.count} ratings for the owner`);

    // 3. Update the rating
    console.log("\n3. Updating the owner rating");
    const updatedRating = await authorizedRequest(
      "PUT",
      `/owner-ratings/${ratingId}`,
      {
        score: 5,
        comment: "Updated: Excellent service! Would rent from again.",
        communication: 5,
        reliability: 5,
        itemCondition: 5,
      }
    );
    console.log("Owner rating updated:", updatedRating);

    // 4. Delete the rating
    console.log("\n4. Deleting the owner rating");
    const deleteResult = await authorizedRequest(
      "DELETE",
      `/owner-ratings/${ratingId}`
    );
    console.log("Owner rating deleted:", deleteResult);

    console.log("\nOwner rating tests completed successfully");
  } catch (error) {
    console.error("Error testing owner ratings:", error);
  }
};

// Run all tests
const runTests = async () => {
  try {
    // Login first
    await login();

    // Test both rating systems
    await testItemRatings();
    await testOwnerRatings();

    console.log("\n--- ALL TESTS COMPLETED ---");
  } catch (error) {
    console.error("Test failed:", error);
  }
};

// Run tests
runTests();
