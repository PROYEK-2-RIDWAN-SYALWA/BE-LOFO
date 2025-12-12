// File: src/middleware/authMiddleware.js
const supabase = require('../config/supabaseClient');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token tidak ditemukan.' });
    }

    const token = authHeader.split(' ')[1];

    const { data: { user }, error } = await supabase.auth.getUser(token);

    // --- MODIFIKASI MULAI ---
    if (error) {
      // Ini akan mencetak alasan penolakan di Terminal VS Code Anda (bukan di Postman)
      console.log("❌ GAGAL VERIFIKASI TOKEN:", error.message); 
      return res.status(401).json({ error: `Token Ditolak: ${error.message}` });
    }
    // --- MODIFIKASI SELESAI ---

    if (!user) {
      return res.status(401).json({ error: 'User tidak ditemukan.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("System Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// [BARU] Middleware Khusus Admin
const verifyAdmin = async (req, res, next) => {
  try {
    // 1. Pastikan verifyToken sudah dijalankan sebelumnya
    // req.user harus sudah ada (dari middleware sebelumnya)
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Akses ditolak. User tidak teridentifikasi.' });
    }

    // 2. Cek Role di Database berdasarkan auth_id dari token
    const { data: userData, error } = await supabase
      .from('akun_pengguna')
      .select('id_role')
      .eq('auth_id', req.user.id)
      .single();

    if (error || !userData) {
      return res.status(403).json({ error: 'Gagal memverifikasi hak akses.' });
    }

    // 3. Cek apakah ID Role = 99 (Admin)
    if (userData.id_role !== 99) {
      return res.status(403).json({ error: 'Akses Terlarang! Area ini khusus Admin.' });
    }

    // Lolos seleksi, silakan lanjut
    next();

  } catch (err) {
    console.error("Admin Middleware Error:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// PENTING: Export object yang berisi DUA middleware
// Pastikan baris exports di paling bawah file diubah menjadi ini:
module.exports = { verifyToken, verifyAdmin };