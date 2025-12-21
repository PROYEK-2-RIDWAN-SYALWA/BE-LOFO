const supabase = require('../config/supabaseClient');
const { createNotificationInternal } = require('./notificationController');

// ===================================================================
// CLAIM CONTROLLER - Sistem Klaim Barang Lost & Found
// ===================================================================

/**
 * 1. CREATE CLAIM - User mengajukan klaim untuk barang yang ditemukan
 * Hanya bisa mengklaim postingan dengan tipe 'ditemukan' dan status 'aktif'
 */
exports.createClaim = async (req, res) => {
  const { id_postingan, file_bukti, catatan_klaim } = req.body;
  const authId = req.user.id;

  try {
    // 1. Dapatkan ID Pengguna dari auth_id
    const { data: userData, error: userError } = await supabase
      .from('akun_pengguna')
      .select('id_pengguna, nama_lengkap')
      .eq('auth_id', authId)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // 2. Validasi postingan: Harus ada, status 'aktif', dan tipe 'ditemukan'
    const { data: postingan, error: postError } = await supabase
      .from('postingan_barang')
      .select(`
        id_postingan, 
        id_pelapor, 
        status_postingan, 
        tipe_postingan, 
        nama_barang,
        akun_pengguna!inner(auth_id, nama_lengkap)
      `)
      .eq('id_postingan', id_postingan)
      .single();

    if (postError || !postingan) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan' });
    }

    // Validasi: Hanya barang 'ditemukan' yang bisa diklaim
    if (postingan.tipe_postingan !== 'ditemukan') {
      return res.status(400).json({
        error: 'Hanya postingan "Barang Ditemukan" yang dapat diklaim'
      });
    }

    // Validasi: Status harus 'aktif'
    if (postingan.status_postingan !== 'aktif') {
      return res.status(400).json({
        error: `Postingan tidak dapat diklaim. Status saat ini: ${postingan.status_postingan}`
      });
    }

    // Validasi: User tidak boleh mengklaim barang yang dia posting sendiri
    if (postingan.akun_pengguna.auth_id === authId) {
      return res.status(400).json({
        error: 'Anda tidak dapat mengklaim barang yang Anda posting sendiri'
      });
    }

    // 3. Cek apakah sudah ada klaim aktif (pending) untuk postingan ini
    const { data: existingClaim } = await supabase
      .from('data_klaim')
      .select('id_klaim')
      .eq('id_postingan', id_postingan)
      .is('tindakan_validasi', null) // Pending
      .single();

    if (existingClaim) {
      return res.status(400).json({
        error: 'Sudah ada klaim yang sedang menunggu validasi untuk barang ini'
      });
    }

    // 4. Insert klaim baru
    const { data: newClaim, error: claimError } = await supabase
      .from('data_klaim')
      .insert({
        id_postingan: parseInt(id_postingan),
        id_pemilik: userData.id_pengguna,
        file_bukti,
        catatan_validasi: catatan_klaim, // Catatan dari pengklaim
        tindakan_validasi: null // Pending
      })
      .select()
      .single();

    if (claimError) throw claimError;

    // 5. Update status postingan menjadi 'menunggu_validasi'
    await supabase
      .from('postingan_barang')
      .update({ status_postingan: 'menunggu_validasi' })
      .eq('id_postingan', id_postingan);

    // 6. Kirim notifikasi ke PENEMU (pemilik postingan)
    await createNotificationInternal(
      postingan.akun_pengguna.auth_id,
      'Klaim Barang Masuk! 📦',
      `${userData.nama_lengkap} mengajukan klaim untuk "${postingan.nama_barang}". Silakan validasi bukti yang diberikan.`,
      'warning',
      `/post/${id_postingan}` // Link ke detail postingan
    );

    res.status(201).json({
      message: 'Klaim berhasil diajukan. Menunggu validasi dari penemu.',
      data: newClaim
    });

  } catch (error) {
    console.error('Create Claim Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 2. GET MY CLAIMS - Lihat semua klaim yang saya ajukan
 */
exports.getMyClaims = async (req, res) => {
  const authId = req.user.id;

  try {
    // Dapatkan id_pengguna
    const { data: userData } = await supabase
      .from('akun_pengguna')
      .select('id_pengguna')
      .eq('auth_id', authId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Ambil semua klaim yang diajukan user beserta info postingan
    const { data, error } = await supabase
      .from('data_klaim')
      .select(`
        *,
        postingan_barang (
          id_postingan,
          nama_barang,
          foto_barang,
          status_postingan,
          akun_pengguna ( nama_lengkap, no_wa )
        )
      `)
      .eq('id_pemilik', userData.id_pengguna)
      .order('tgl_klaim', { ascending: false });

    if (error) throw error;
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 3. GET INCOMING CLAIMS - Lihat klaim masuk untuk barang yang saya temukan
 * (Untuk validasi oleh Penemu)
 */
exports.getIncomingClaims = async (req, res) => {
  const authId = req.user.id;

  try {
    // Dapatkan id_pengguna
    const { data: userData } = await supabase
      .from('akun_pengguna')
      .select('id_pengguna')
      .eq('auth_id', authId)
      .single();

    if (!userData) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Ambil semua postingan user yang memiliki status 'menunggu_validasi'
    // beserta data klaimnya
    const { data, error } = await supabase
      .from('data_klaim')
      .select(`
        *,
        akun_pengguna!data_klaim_id_pemilik_fkey ( 
          nama_lengkap, 
          no_wa, 
          username,
          foto_profil 
        ),
        postingan_barang!inner (
          id_postingan,
          nama_barang,
          foto_barang,
          deskripsi,
          id_pelapor,
          status_postingan
        )
      `)
      .eq('postingan_barang.id_pelapor', userData.id_pengguna)
      .is('tindakan_validasi', null) // Hanya yang pending
      .order('tgl_klaim', { ascending: false });

    if (error) throw error;
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 4. APPROVE CLAIM - Penemu menyetujui klaim
 */
exports.approveClaim = async (req, res) => {
  const { id } = req.params; // id_klaim
  const authId = req.user.id;

  try {
    // 1. Ambil data klaim beserta postingan
    const { data: klaim, error: klaimError } = await supabase
      .from('data_klaim')
      .select(`
        *,
        akun_pengguna!data_klaim_id_pemilik_fkey ( auth_id, nama_lengkap ),
        postingan_barang!inner (
          id_postingan,
          id_pelapor,
          nama_barang,
          akun_pengguna!inner ( auth_id, no_wa, nama_lengkap )
        )
      `)
      .eq('id_klaim', id)
      .single();

    if (klaimError || !klaim) {
      return res.status(404).json({ error: 'Klaim tidak ditemukan' });
    }

    // 2. Validasi: Hanya penemu yang boleh approve
    if (klaim.postingan_barang.akun_pengguna.auth_id !== authId) {
      return res.status(403).json({
        error: 'Anda tidak berhak memvalidasi klaim ini'
      });
    }

    // 3. Validasi: Klaim harus masih pending
    if (klaim.tindakan_validasi !== null) {
      return res.status(400).json({
        error: `Klaim sudah diproses sebelumnya: ${klaim.tindakan_validasi}`
      });
    }

    // 4. Update klaim menjadi approved
    const { error: updateClaimError } = await supabase
      .from('data_klaim')
      .update({
        tindakan_validasi: 'disetujui',
        tgl_validasi: new Date().toISOString()
      })
      .eq('id_klaim', id);

    if (updateClaimError) throw updateClaimError;

    // 5. Update status postingan menjadi 'selesai'
    await supabase
      .from('postingan_barang')
      .update({ status_postingan: 'selesai' })
      .eq('id_postingan', klaim.id_postingan);

    // 6. Kirim notifikasi ke Pengklaim (Pemilik barang)
    await createNotificationInternal(
      klaim.akun_pengguna.auth_id,
      'Klaim Anda Disetujui! 🎉',
      `Selamat! Klaim Anda untuk "${klaim.postingan_barang.nama_barang}" telah disetujui. Hubungi penemu di: ${klaim.postingan_barang.akun_pengguna.no_wa}`,
      'success',
      `/post/${klaim.id_postingan}`
    );

    res.json({
      message: 'Klaim disetujui. Notifikasi telah dikirim ke pemilik barang.',
      contact: klaim.postingan_barang.akun_pengguna.no_wa
    });

  } catch (error) {
    console.error('Approve Claim Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 5. REJECT CLAIM - Penemu menolak klaim
 */
exports.rejectClaim = async (req, res) => {
  const { id } = req.params; // id_klaim
  const { alasan } = req.body; // Alasan penolakan
  const authId = req.user.id;

  // Validasi: Alasan wajib diisi
  if (!alasan || alasan.trim().length < 10) {
    return res.status(400).json({
      error: 'Alasan penolakan wajib diisi (minimal 10 karakter)'
    });
  }

  try {
    // 1. Ambil data klaim beserta postingan
    const { data: klaim, error: klaimError } = await supabase
      .from('data_klaim')
      .select(`
        *,
        akun_pengguna!data_klaim_id_pemilik_fkey ( auth_id, nama_lengkap ),
        postingan_barang!inner (
          id_postingan,
          id_pelapor,
          nama_barang,
          akun_pengguna!inner ( auth_id )
        )
      `)
      .eq('id_klaim', id)
      .single();

    if (klaimError || !klaim) {
      return res.status(404).json({ error: 'Klaim tidak ditemukan' });
    }

    // 2. Validasi: Hanya penemu yang boleh reject
    if (klaim.postingan_barang.akun_pengguna.auth_id !== authId) {
      return res.status(403).json({
        error: 'Anda tidak berhak memvalidasi klaim ini'
      });
    }

    // 3. Validasi: Klaim harus masih pending
    if (klaim.tindakan_validasi !== null) {
      return res.status(400).json({
        error: `Klaim sudah diproses sebelumnya: ${klaim.tindakan_validasi}`
      });
    }

    // 4. Update klaim menjadi rejected
    const { error: updateClaimError } = await supabase
      .from('data_klaim')
      .update({
        tindakan_validasi: 'ditolak',
        tgl_validasi: new Date().toISOString(),
        catatan_validasi: alasan
      })
      .eq('id_klaim', id);

    if (updateClaimError) throw updateClaimError;

    // 5. Update status postingan kembali ke 'aktif' (bisa diklaim user lain)
    await supabase
      .from('postingan_barang')
      .update({ status_postingan: 'aktif' })
      .eq('id_postingan', klaim.id_postingan);

    // 6. Kirim notifikasi ke Pengklaim
    await createNotificationInternal(
      klaim.akun_pengguna.auth_id,
      'Klaim Ditolak ❌',
      `Maaf, klaim Anda untuk "${klaim.postingan_barang.nama_barang}" ditolak. Alasan: ${alasan}`,
      'error',
      `/post/${klaim.id_postingan}`
    );

    res.json({
      message: 'Klaim ditolak. Postingan kembali aktif untuk diklaim user lain.'
    });

  } catch (error) {
    console.error('Reject Claim Error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 6. GET CLAIM BY POST ID - Ambil klaim berdasarkan ID Postingan
 * Untuk halaman detail postingan
 */
exports.getClaimByPostId = async (req, res) => {
  const { postId } = req.params;

  try {
    const { data, error } = await supabase
      .from('data_klaim')
      .select(`
        *,
        akun_pengguna!data_klaim_id_pemilik_fkey ( 
          nama_lengkap, 
          username,
          foto_profil 
        )
      `)
      .eq('id_postingan', postId)
      .order('tgl_klaim', { ascending: false });

    if (error) throw error;
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
