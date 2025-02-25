require('dotenv').config();
const express = require("express");
const connectDB = require("./db");
const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listings'); 
const cartRoutes = require('./routes/cartRoutes');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');


const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const PORT = process.env.PORT || 3000;


app.use(express.json());


connectDB();

app.use(cors({
    origin: 'http://127.0.0.1:5500',  
    credentials: true
  }));
  
app.use('/api', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api', cartRoutes);

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal server error" });
});


process.on('SIGINT', async () => {
    console.log("Server shutting down...");
    await mongoose.connection.close();
    process.exit(0);
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
