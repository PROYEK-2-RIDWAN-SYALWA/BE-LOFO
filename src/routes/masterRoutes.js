const express = require('express');
const router = express.Router();
const masterController = require('../controllers/masterController');

// GET /api/master/prodi
router.get('/prodi', masterController.getAllProdi);
router.get('/kategori', masterController.getAllKategori);

module.exports = router;