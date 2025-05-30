require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./Models/userModel');
const connectDB = require('./db');

// Connect to database
connectDB();

async function resetAdminPassword() {
  try {
    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    
    if (!adminUser) {
      console.log('Admin user not found');
      return;
    }
    
    console.log('Found admin user:', adminUser.email);
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Update the password
    adminUser.password = hashedPassword;
    await adminUser.save();
    
    console.log('Admin password reset successfully');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
    // Verify the password works
    const passwordMatch = await bcrypt.compare('admin123', adminUser.password);
    console.log('Password verification:', passwordMatch ? 'Success' : 'Failed');
    
  } catch (error) {
    console.error('Error resetting admin password:', error);
  } finally {
    // Disconnect from database
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

resetAdminPassword();
