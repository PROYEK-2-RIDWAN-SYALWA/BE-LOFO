const supabase = require('../config/supabaseClient');

exports.getAllProdi = async (req, res) => {
  try {
    // Ambil semua data dari tabel master_prodi
    const { data, error } = await supabase
      .from('master_prodi')
      .select('*')
      .order('nama_prodi', { ascending: true }); // Urutkan A-Z biar rapi

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Get Prodi Error:", error.message);
    res.status(500).json({ error: 'Gagal mengambil data prodi' });
  }
};

exports.getAllKategori = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('master_kategori')
      .select('*')
      .order('nama_kategori', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil kategori' });
  }
};