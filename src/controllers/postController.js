const supabase = require('../config/supabaseClient');

exports.createPost = async (req, res) => {
  const { auth_id, tipe_postingan, nama_barang, deskripsi, lokasi, foto_barang } = req.body;

  try {
    // 1. CARI ID PELAPOR DULU (Translasi UUID -> ID Integer)
    const { data: userData, error: userError } = await supabase
      .from('akun_pengguna')
      .select('id_pengguna, no_wa')
      .eq('auth_id', auth_id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User profil tidak ditemukan. Lengkapi profil dulu!' });
    }

    // 2. INSERT POSTINGAN
    const { data, error } = await supabase
      .from('postingan_barang')
      .insert([
        {
          id_pelapor: userData.id_pengguna,
          tipe_postingan, // 'kehilangan' atau 'ditemukan'
          nama_barang,
          deskripsi,
          foto_barang: foto_barang || 'https://placehold.co/600x400?text=No+Image', // Placeholder jika kosong
          lokasi_terlapor: lokasi,
          info_kontak_wa: userData.no_wa, // Otomatis ambil dari profil
          status_postingan: 'aktif'
        }
      ])
      .select();

    if (error) throw error;

    res.status(201).json({ message: 'Postingan berhasil dibuat!', data });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    // Join dengan tabel akun_pengguna untuk dapat nama pelapor
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