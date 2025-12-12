const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware'); // Import destructuring

// SEMUA ROUTE DISINI DILINDUNGI GANDA:
// 1. verifyToken (Cek Login)
// 2. verifyAdmin (Cek Role Admin)

// Dashboard Stats
router.get('/stats', verifyToken, verifyAdmin, adminController.getStats);

// User Management
router.get('/users', verifyToken, verifyAdmin, adminController.getAllUsers);
router.put('/users/:id_pengguna/verify', verifyToken, verifyAdmin, adminController.verifyUser);

// Content Management
router.delete('/posts/:id_postingan', verifyToken, verifyAdmin, adminController.deletePost);

module.exports = router;