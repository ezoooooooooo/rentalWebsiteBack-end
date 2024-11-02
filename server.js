const express = require("express");
const connectDB = require("./db");
const authRoutes = require('./routes/authRoutes');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
connectDB();
app.get("/", (req, res) => {
  res.send("Welcome to the Rent Website API");
});

app.use('/api', authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
