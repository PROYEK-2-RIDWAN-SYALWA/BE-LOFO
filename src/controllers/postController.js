const supabase = require('../config/supabaseClient');

exports.createPost = async (req, res) => {
  // [SECURITY FIX]
  // HAPUS 'auth_id' dari req.body. Jangan pernah terima ID user dari inputan mentah!
  const { tipe_postingan, nama_barang, deskripsi, lokasi, foto_barang, id_kategori, waktu_kejadian } = req.body;

  // AMBIL ID DARI TOKEN (Hasil kerja Middleware)
  const authIdFromToken = req.user.id; 

  try {
    // 1. CARI ID PENGGUNA BERDASARKAN AUTH ID YANG TERPERCAYA
    const { data: userData, error: userError } = await supabase
      .from('akun_pengguna')
      .select('id_pengguna, no_wa')
      .eq('auth_id', authIdFromToken) // Gunakan ID dari Token
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User profil tidak ditemukan. Pastikan Anda sudah login.' });
    }

    // 2. INSERT POSTINGAN
    const { data, error } = await supabase
      .from('postingan_barang')
      .insert([
        {
          id_pelapor: userData.id_pengguna,
          id_kategori: parseInt(id_kategori),
          tipe_postingan, 
          nama_barang,
          deskripsi,
          foto_barang: foto_barang || 'https://placehold.co/600x400?text=No+Image',
          lokasi_terlapor: lokasi,
          info_kontak_wa: userData.no_wa, 
          status_postingan: 'aktif',
          // waktu_kejadian: waktu_kejadian // Menambahkan field waktu_kejadian sesuai input form
        }
      ])
      .select();

    if (error) throw error;
    res.status(201).json({ message: 'Postingan berhasil dibuat!', data });

  } catch (error) {
    console.error("Create Post Error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('postingan_barang')
      .select(`
        *,
        akun_pengguna ( nama_lengkap, username ) 
      `)
      .order('tgl_postingan', { ascending: false });

    if (error) throw error;
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyPosts = async (req, res) => {
  // [SECURITY FIX] Gunakan ID dari Token, bukan dari req.query
  const authIdFromToken = req.user.id; 

  try {
    // 1. Cari ID Integer user
    const { data: userData, error: userError } = await supabase
      .from('akun_pengguna')
      .select('id_pengguna')
      .eq('auth_id', authIdFromToken)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // 2. Ambil postingan
    const { data, error } = await supabase
      .from('postingan_barang')
      .select('*')
      .eq('id_pelapor', userData.id_pengguna)
      .order('tgl_postingan', { ascending: false });

    if (error) throw error;
    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// [BARU] Ambil Detail 1 Postingan berdasarkan ID
exports.getPostById = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('postingan_barang')
      .select(`
        *,
        akun_pengguna ( auth_id, nama_lengkap, no_wa, username, master_roles(nama_role) ),
        master_kategori ( nama_kategori )
      `)
      .eq('id_postingan', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// [BARU] Update Status Postingan (Selesai/Aktif)
exports.updatePostStatus = async (req, res) => {
  const { id } = req.params; // ID Postingan
  const { status } = req.body; // 'selesai' atau 'aktif'
  const authId = req.user.id; // Dari Token

  try {
    // 1. Cek apakah yang request adalah pemilik postingan?
    // Kita cari id_pelapor dari postingan, lalu cocokan dengan user yg login
    const { data: post } = await supabase
      .from('postingan_barang')
      .select('id_pelapor, akun_pengguna!inner(auth_id)')
      .eq('id_postingan', id)
      .single();

    if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

    // Validasi Kepemilikan (Hanya pemilik yang boleh ubah status)
    if (post.akun_pengguna.auth_id !== authId) {
      return res.status(403).json({ error: 'Anda tidak berhak mengubah status postingan ini.' });
    }

    // 2. Update Status
    const { data, error } = await supabase
      .from('postingan_barang')
      .update({ status_postingan: status })
      .eq('id_postingan', id)
      .select();

    if (error) throw error;
    res.json({ message: 'Status berhasil diperbarui', data });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};