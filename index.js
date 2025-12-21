require('dotenv').config();
const express = require('express');
const cors = require('cors');
const postRoutes = require('./src/routes/postRoutes');
const masterRoutes = require('./src/routes/masterRoutes');
const userRoutes = require('./src/routes/userRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const authRoutes = require('./src/routes/authRoutes');
const claimRoutes = require('./src/routes/claimRoutes'); // <-- BARU: Claim Routes
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

// Notification Routes
app.use('/api/notifications', require('./src/routes/notificationRoutes'));

// Mounting Routes
app.use('/api/posts', postRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/claims', claimRoutes); // <-- BARU: Mount Claim Routes