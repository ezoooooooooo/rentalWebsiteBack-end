const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api';

const createTestAccounts = async () => {
  try {
    // Create test user
    const userResponse = await axios.post(`${BASE_URL}/signup`, {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'Test123456!',
      phone: '1234567890',
      address: 'Test Address'
    });
    console.log('Test user created:', userResponse.data);

    // Create test owner
    const ownerResponse = await axios.post(`${BASE_URL}/signup`, {
      firstName: 'Test',
      lastName: 'Owner',
      email: 'testowner@example.com',
      password: 'Test123456!',
      phone: '0987654321',
      address: 'Test Address'
    });
    console.log('Test owner created:', ownerResponse.data);

    console.log('Test accounts setup completed!');
  } catch (error) {
    console.error('Error setting up test accounts:', error.response?.data || error.message);
  }
};

createTestAccounts().catch(console.error); 