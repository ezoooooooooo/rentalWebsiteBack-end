const express = require("express");
const connectDB = require("./db");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
connectDB();
app.get("/", (req, res) => {
  res.send("Welcome to the Rent Website API");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
