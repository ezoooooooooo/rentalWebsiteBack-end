require('dotenv').config();
const axios = require('axios');

async function testAdminLogin() {
  try {
    console.log('Testing admin login...');
    
    const response = await axios.post('http://localhost:3000/api/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    console.log('Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Test an admin endpoint with the token
    if (response.data.token) {
      console.log('\nTesting admin endpoint access...');
      
      try {
        const adminResponse = await axios.get('http://localhost:3000/api/admin/dashboard/stats', {
          headers: {
            'Authorization': `Bearer ${response.data.token}`
          }
        });
        
        console.log('Admin endpoint access successful!');
        console.log('Admin stats:', JSON.stringify(adminResponse.data, null, 2));
      } catch (adminError) {
        console.error('Admin endpoint access failed:');
        console.error('Status:', adminError.response?.status);
        console.error('Message:', adminError.response?.data);
      }
    }
    
  } catch (error) {
    console.error('Login failed:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data);
    
    // Let's try to debug by checking if the user exists
    try {
      console.log('\nChecking if admin user exists in database...');
      const mongoose = require('mongoose');
      const User = require('./Models/userModel');
      const connectDB = require('./db');
      
      await connectDB();
      
      const adminUser = await User.findOne({ email: 'admin@example.com' });
      
      if (adminUser) {
        console.log('Admin user found in database:');
        console.log('- Email:', adminUser.email);
        console.log('- Role:', adminUser.role);
        console.log('- Password hash length:', adminUser.password.length);
        
        // Check password with bcrypt
        const bcrypt = require('bcryptjs');
        const passwordMatch = await bcrypt.compare('admin123', adminUser.password);
        console.log('- Password match:', passwordMatch);
      } else {
        console.log('Admin user NOT found in database!');
      }
      
      await mongoose.connection.close();
    } catch (dbError) {
      console.error('Database check error:', dbError);
    }
  }
}

testAdminLogin();
