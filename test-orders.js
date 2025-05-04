const axios = require("axios");
require("dotenv").config();

const BASE_URL = "http://localhost:3000/api";
// Add mock tokens for testing when rate limited
let userToken = process.env.TEST_USER_TOKEN || "";
let ownerToken = process.env.TEST_OWNER_TOKEN || "";
let cartId = "";
let listingId = "67ba3cf2219e8753f3c85e27";
let orderId = "";

// Helper function to make authenticated requests
const makeAuthRequest = async (method, url, data = null, token) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };
    if (data) config.data = data;
    return await axios(config);
  } catch (error) {
    console.error(
      `Error in ${method} ${url}:`,
      error.response?.data || error.message
    );
    throw error;
  }
};

// Helper function to wait
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Test user login
const loginUser = async () => {
  try {
    // Comment out the wait to test immediately
    // console.log("Waiting 15 minutes for rate limit to reset...");
    // await wait(15 * 60 * 1000);

    const response = await axios.post(`${BASE_URL}/login`, {
      email: "ezooooooo@gmail.com",
      password: "Asd1234567#",
    });
    userToken = response.data.token;
    console.log("User logged in successfully");
  } catch (error) {
    console.error("User login failed:", error.response?.data || error.message);
    throw error;
  }
};

// Test owner login
const loginOwner = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/login`, {
      email: "mariam@gmail.com",
      password: "Asd123456789@",
    });
    ownerToken = response.data.token;
    console.log("Owner logged in successfully");
  } catch (error) {
    console.error("Owner login failed:", error.response?.data || error.message);
  }
};

// Test cart creation
const createCart = async () => {
  try {
    console.log("Creating cart with listing ID:", listingId);
    const response = await makeAuthRequest(
      "POST",
      "/cart",
      {
        listingId: listingId,
        rentalDays: 5,
      },
      userToken
    );
    console.log("Cart creation response:", response.data);

    if (response.data.success) {
      if (response.data.alreadyInCart) {
        console.log("Item is already in cart, proceeding with existing cart");
        // Get the existing cart
        const cartResponse = await makeAuthRequest(
          "GET",
          "/cart",
          null,
          userToken
        );
        if (cartResponse.data.success && cartResponse.data.cart) {
          cartId = cartResponse.data.cart._id;
          console.log("Using existing cart. Cart ID:", cartId);
        }
      } else if (response.data.cart) {
        cartId = response.data.cart._id;
        console.log("Cart created successfully. Cart ID:", cartId);
      }
    } else {
      throw new Error("Cart creation failed");
    }
  } catch (error) {
    console.error(
      "Cart creation failed:",
      error.response?.data || error.message
    );
    throw error;
  }
};

// Test availability check
const checkAvailability = async () => {
  try {
    const response = await makeAuthRequest(
      "POST",
      "/orders/check-availability",
      {
        listingId,
        startDate: "2024-04-20",
        endDate: "2024-04-25",
      },
      userToken
    );
    console.log("Availability check:", response.data);
  } catch (error) {
    console.error(
      "Availability check failed:",
      error.response?.data || error.message
    );
  }
};

// Test payment processing
const processPayment = async () => {
  try {
    // First get the cart details to see what we're working with
    console.log("Fetching cart details...");
    const cartResponse = await makeAuthRequest("GET", "/cart", null, userToken);
    console.log("Cart response:", JSON.stringify(cartResponse.data, null, 2));
    
    const paymentData = {
      cartId,
      startDate: "2024-04-20",
      endDate: "2024-04-25",
      rentalDays: 5,
      // Add a hardcoded totalPrice for testing
      totalPrice: 100
    };
    
    console.log("Sending payment request with data:", JSON.stringify(paymentData, null, 2));
    
    const response = await makeAuthRequest(
      "POST",
      "/orders/payment",
      paymentData,
      userToken
    );
    
    console.log("Payment response:", JSON.stringify(response.data, null, 2));
    
    if (response.data.orders && response.data.orders.length > 0) {
      orderId = response.data.orders[0]._id;
      console.log("Payment processed successfully. Order ID:", orderId);
    } else {
      console.log("Payment processed but no orders were created");
    }
  } catch (error) {
    console.error(
      "Payment processing failed:",
      error.response?.data || error.message
    );
    
    // Log more details about the error
    if (error.response) {
      console.error("Error status:", error.response.status);
      console.error("Error headers:", error.response.headers);
      console.error("Error data:", JSON.stringify(error.response.data, null, 2));
    }
  }
};

// Test getting user orders
const getUserOrders = async () => {
  try {
    const response = await makeAuthRequest(
      "GET",
      "/orders/my-orders",
      null,
      userToken
    );
    console.log("User orders:", response.data);
  } catch (error) {
    console.error(
      "Getting user orders failed:",
      error.response?.data || error.message
    );
  }
};

// Test getting owner orders
const getOwnerOrders = async () => {
  if (!ownerToken) {
    console.log("Skipping owner orders - owner not logged in");
    return;
  }

  try {
    const response = await makeAuthRequest(
      "GET",
      "/orders/owner-orders",
      null,
      ownerToken
    );
    console.log("Owner orders:", response.data);
  } catch (error) {
    console.error(
      "Getting owner orders failed:",
      error.response?.data || error.message
    );
  }
};

// Test updating order status
const updateOrderStatus = async () => {
  if (!orderId) {
    console.log("Skipping order status update - no order ID available");
    return;
  }

  if (!ownerToken) {
    console.log("Skipping order status update - owner not logged in");
    return;
  }

  try {
    const response = await makeAuthRequest(
      "PUT",
      `/orders/${orderId}/status`,
      {
        status: "approved",
      },
      ownerToken
    );
    console.log("Order status updated:", response.data);
  } catch (error) {
    console.error(
      "Updating order status failed:",
      error.response?.data || error.message
    );
  }
};

// Run all tests
const runTests = async () => {
  console.log("Starting order system tests...");

  try {
    await loginUser();
    await loginOwner();
    await createCart();
    await checkAvailability();
    await processPayment();
    await getUserOrders();
    await getOwnerOrders();
    await updateOrderStatus();
  } catch (error) {
    console.error("Test failed:", error.message);
  }

  console.log("All tests completed!");
};

runTests().catch(console.error);
