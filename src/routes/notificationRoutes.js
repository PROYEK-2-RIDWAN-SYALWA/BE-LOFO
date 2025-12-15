const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// PERBAIKAN:
// 1. Ubah path dari '../middlewares/' menjadi '../middleware/' (tanpa s)
// 2. Tambahkan kurung kurawal { } karena authMiddleware mengekspor objek
const { verifyToken } = require('../middleware/authMiddleware');

// Semua rute butuh login
router.get('/', verifyToken, notificationController.getMyNotifications);
router.put('/:id/read', verifyToken, notificationController.markAsRead);

module.exports = router;