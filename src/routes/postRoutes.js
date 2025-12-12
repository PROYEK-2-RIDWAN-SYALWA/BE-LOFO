const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/posts - Buat postingan baru (DILINDUNGI)
// Artinya: Hanya user yang punya token valid yang bisa akses controller ini
router.post('/', verifyToken, postController.createPost);

// GET /api/posts - Ambil semua postingan (PUBLIK - Siapa saja boleh lihat)
router.get('/', postController.getAllPosts);

// GET /api/posts/history - Ambil postingan user sendiri (DILINDUNGI)
// Kita lindungi agar orang tidak bisa mengintip history orang lain
router.get('/history', verifyToken, postController.getMyPosts);


// GET /api/posts/:id - Ambil detail postingan berdasarkan ID (PUBLIK)
router.get('/:id', verifyToken, postController.getPostById);

// PUT /api/posts/:id/status - Update status postingan (DILINDUNGI)
router.put('/:id/status', verifyToken, postController.updatePostStatus);

module.exports = router;