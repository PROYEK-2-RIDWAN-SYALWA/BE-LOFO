const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// ===================================================================
// PUBLIC ROUTES (Untuk dropdown di form)
// ===================================================================
router.get('/prodi', masterController.getAllProdi);
router.get('/kategori', masterController.getAllKategori);

// ===================================================================
// ADMIN ROUTES (CRUD Kategori & Prodi)
// ===================================================================

// Kategori
router.post('/kategori', verifyToken, verifyAdmin, masterController.createKategori);
router.put('/kategori/:id', verifyToken, verifyAdmin, masterController.updateKategori);
router.delete('/kategori/:id', verifyToken, verifyAdmin, masterController.deleteKategori);

// Prodi
router.post('/prodi', verifyToken, verifyAdmin, masterController.createProdi);
router.put('/prodi/:id', verifyToken, verifyAdmin, masterController.updateProdi);
router.delete('/prodi/:id', verifyToken, verifyAdmin, masterController.deleteProdi);

module.exports = router;