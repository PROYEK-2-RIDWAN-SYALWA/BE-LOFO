const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// POST /api/posts - Buat postingan baru
router.post('/', postController.createPost);

// GET /api/posts - Ambil semua postingan
router.get('/', postController.getAllPosts);

// GET /api/posts/history?auth_id=... - Ambil postingan user tertentu
router.get('/history', postController.getMyPosts);

module.exports = router;