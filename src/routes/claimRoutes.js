const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { verifyToken } = require('../middleware/authMiddleware');

// ===================================================================
// CLAIM ROUTES - Semua endpoint memerlukan autentikasi
// ===================================================================

// POST /api/claims - Ajukan klaim barang
router.post('/', verifyToken, claimController.createClaim);

// GET /api/claims/my-claims - Lihat klaim yang saya ajukan
router.get('/my-claims', verifyToken, claimController.getMyClaims);

// GET /api/claims/incoming - Lihat klaim masuk untuk barang yang saya temukan
router.get('/incoming', verifyToken, claimController.getIncomingClaims);

// GET /api/claims/post/:postId - Lihat klaim berdasarkan ID postingan
router.get('/post/:postId', verifyToken, claimController.getClaimByPostId);

// PUT /api/claims/:id/approve - Setujui klaim (oleh Penemu)
router.put('/:id/approve', verifyToken, claimController.approveClaim);

// PUT /api/claims/:id/reject - Tolak klaim (oleh Penemu)
router.put('/:id/reject', verifyToken, claimController.rejectClaim);

module.exports = router;
