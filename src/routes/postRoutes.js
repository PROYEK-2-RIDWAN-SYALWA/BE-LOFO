const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// POST /api/posts - Buat postingan baru
router.post('/', postController.createPost);

// GET /api/posts - Ambil semua postingan
router.get('/', postController.getAllPosts);

module.exports = router;