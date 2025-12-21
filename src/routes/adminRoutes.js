const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware'); // Import destructuring

// SEMUA ROUTE DISINI DILINDUNGI GANDA:
// 1. verifyToken (Cek Login)
// 2. verifyAdmin (Cek Role Admin)

// Dashboard Stats
router.get('/stats', verifyToken, verifyAdmin, adminController.getStats);

// ===================================================================
// User Management
// ===================================================================

// GET /api/admin/users - Lihat semua user (dengan filter status)
router.get('/users', verifyToken, verifyAdmin, adminController.getAllUsers);

// GET /api/admin/users/:id_pengguna - Detail user lengkap dengan profil
router.get('/users/:id_pengguna', verifyToken, verifyAdmin, adminController.getUserDetail);

// PUT /api/admin/users/:id_pengguna/verify - Verifikasi user
router.put('/users/:id_pengguna/verify', verifyToken, verifyAdmin, adminController.verifyUser);

// PUT /api/admin/users/:id_pengguna/reject - Tolak user
router.put('/users/:id_pengguna/reject', verifyToken, verifyAdmin, adminController.rejectUser);

// ===================================================================
// Content Management - Post Verification
// ===================================================================

// GET /api/admin/posts - Ambil semua postingan dengan filter status
router.get('/posts', verifyToken, verifyAdmin, adminController.getAllPostsAdmin);

// PUT /api/admin/posts/:id_postingan/approve - Setujui postingan
router.put('/posts/:id_postingan/approve', verifyToken, verifyAdmin, adminController.approvePost);

// PUT /api/admin/posts/:id_postingan/reject - Tolak postingan
router.put('/posts/:id_postingan/reject', verifyToken, verifyAdmin, adminController.rejectPost);

// DELETE /api/admin/posts/:id_postingan - Hapus postingan (Moderasi)
router.delete('/posts/:id_postingan', verifyToken, verifyAdmin, adminController.deletePost);

module.exports = router;