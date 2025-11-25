require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Membuka gerbang untuk FE
app.use(express.json()); // Agar bisa baca req.body format JSON

// Route Test Sederhana
app.get('/', (req, res) => {
  res.send('Server Lost and Found is Running... 🚀');
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});