require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./Models/userModel');
const Order = require('./Models/Order');
const Listing = require('./Models/Listing');
const connectDB = require('./db');

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';
let adminToken = '';

// Connect to database
connectDB();

// Helper function to create an admin user and get token
async function setupAdminUser() {
  try {
    // Check if admin already exists
    let adminUser = await User.findOne({ email: 'admin@example.com' });
    
    if (!adminUser) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      // Create admin user
      adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        address: 'Admin Office',
        phoneNumber: '123-456-7890'
      });
      
      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Using existing admin user');
    }
    
    // Generate JWT token
    adminToken = jwt.sign(
      { userId: adminUser._id, role: adminUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('Admin token generated');
    return adminUser;
  } catch (error) {
    console.error('Error setting up admin user:', error);
    throw error;
  }
}

// Helper function to make authenticated API requests
async function apiRequest(method, endpoint, data = null) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    
    const config = { headers };
    
    let response;
    if (method === 'GET') {
      response = await axios.get(url, config);
    } else if (method === 'POST') {
      response = await axios.post(url, data, config);
    } else if (method === 'PUT') {
      response = await axios.put(url, data, config);
    } else if (method === 'DELETE') {
      response = await axios.delete(url, config);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    throw error;
  }
}

// Test dashboard stats
async function testDashboardStats() {
  console.log('\n--- Testing Dashboard Stats ---');
  try {
    const stats = await apiRequest('GET', '/admin/dashboard/stats');
    console.log('Dashboard Stats:', JSON.stringify(stats, null, 2));
    return stats;
  } catch (error) {
    console.error('Failed to get dashboard stats');
  }
}

// Test order management
async function testOrderManagement() {
  console.log('\n--- Testing Order Management ---');
  try {
    // Get all orders
    const orders = await apiRequest('GET', '/admin/orders');
    console.log(`Retrieved ${orders.orders.length} orders`);
    
    // If there are orders, test updating the status of the first one
    if (orders.orders.length > 0) {
      const firstOrder = orders.orders[0];
      console.log(`Testing status update for order: ${firstOrder._id}`);
      
      // Determine a new status (different from current)
      const statuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
      const currentStatusIndex = statuses.indexOf(firstOrder.status);
      const newStatusIndex = (currentStatusIndex + 1) % statuses.length;
      const newStatus = statuses[newStatusIndex];
      
      // Update order status
      const updateResult = await apiRequest('PUT', `/admin/orders/${firstOrder._id}/status`, {
        status: newStatus,
        note: 'Test status update from admin dashboard test script'
      });
      
      console.log(`Order status updated from ${firstOrder.status} to ${newStatus}`);
      console.log('Update result:', updateResult.message);
    } else {
      console.log('No orders available to test status update');
    }
    
    return orders;
  } catch (error) {
    console.error('Failed to test order management');
  }
}

// Test user management
async function testUserManagement() {
  console.log('\n--- Testing User Management ---');
  try {
    // Get all users
    const users = await apiRequest('GET', '/admin/users');
    console.log(`Retrieved ${users.users.length} users`);
    
    // Get details of a specific user (first non-admin user)
    const regularUser = users.users.find(user => user.role !== 'admin');
    if (regularUser) {
      console.log(`Testing user details for: ${regularUser.firstName} ${regularUser.lastName}`);
      const userDetails = await apiRequest('GET', `/admin/users/${regularUser._id}`);
      console.log('User details retrieved successfully');
      console.log(`User has ${userDetails.activity.ordersAsRenter.count} orders as renter`);
      console.log(`User has ${userDetails.activity.ordersAsOwner.count} orders as owner`);
      console.log(`User has ${userDetails.activity.listings.count} listings`);
    } else {
      console.log('No regular users found to test user details');
    }
    
    return users;
  } catch (error) {
    console.error('Failed to test user management');
  }
}

// Test listing management
async function testListingManagement() {
  console.log('\n--- Testing Listing Management ---');
  try {
    // Get all listings
    const listings = await apiRequest('GET', '/admin/listings');
    console.log(`Retrieved ${listings.listings.length} listings`);
    
    // If there are listings, test updating the status of the first one
    if (listings.listings.length > 0) {
      const firstListing = listings.listings[0];
      console.log(`Testing status update for listing: ${firstListing.name}`);
      
      // Toggle featured status
      const newFeaturedStatus = !firstListing.featured;
      
      // Update listing
      const updateResult = await apiRequest('PUT', `/admin/listings/${firstListing._id}/status`, {
        featured: newFeaturedStatus
      });
      
      console.log(`Listing featured status updated to: ${newFeaturedStatus}`);
      console.log('Update result:', updateResult.message);
    } else {
      console.log('No listings available to test status update');
    }
    
    return listings;
  } catch (error) {
    console.error('Failed to test listing management');
  }
}

// Test analytics
async function testAnalytics() {
  console.log('\n--- Testing Analytics ---');
  try {
    // Test revenue analytics
    console.log('Testing revenue analytics...');
    const revenueAnalytics = await apiRequest('GET', '/admin/analytics/revenue');
    console.log(`Retrieved revenue data for ${revenueAnalytics.analytics.length} periods`);
    
    // Test popular listings
    console.log('Testing popular listings analytics...');
    const popularListings = await apiRequest('GET', '/admin/analytics/popular-listings');
    console.log(`Retrieved ${popularListings.popularListings.length} popular listings`);
    
    // Test user activity
    console.log('Testing user activity analytics...');
    const userActivity = await apiRequest('GET', '/admin/analytics/user-activity');
    console.log('User activity data retrieved successfully');
    
    return {
      revenueAnalytics,
      popularListings,
      userActivity
    };
  } catch (error) {
    console.error('Failed to test analytics');
  }
}

// Main test function
async function runTests() {
  try {
    console.log('Starting admin dashboard tests...');
    
    // Setup admin user and get token
    await setupAdminUser();
    
    // Run tests
    await testDashboardStats();
    await testOrderManagement();
    await testUserManagement();
    await testListingManagement();
    await testAnalytics();
    
    console.log('\nAll tests completed!');
  } catch (error) {
    console.error('Test suite failed:', error);
  } finally {
    // Disconnect from database
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the tests
runTests();
