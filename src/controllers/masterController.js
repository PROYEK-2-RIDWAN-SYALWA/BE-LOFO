const { supabase } = require('../config/supabaseClient');

// ===================================================================
// PRODI
// ===================================================================

exports.getAllProdi = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('master_prodi')
      .select('*')
      .is('deleted_at', null) // Soft delete filter
      .order('nama_prodi', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Get Prodi Error:", error.message);
    res.status(500).json({ error: 'Gagal mengambil data prodi' });
  }
};

exports.createProdi = async (req, res) => {
  const { nama_prodi } = req.body;

  if (!nama_prodi || nama_prodi.trim().length < 3) {
    return res.status(400).json({ error: 'Nama prodi minimal 3 karakter' });
  }

  try {
    const { data, error } = await supabase
      .from('master_prodi')
      .insert({ nama_prodi: nama_prodi.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Prodi dengan nama tersebut sudah ada' });
      }
      throw error;
    }
    res.status(201).json({ message: 'Prodi berhasil ditambahkan', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProdi = async (req, res) => {
  const { id } = req.params;
  const { nama_prodi } = req.body;

  if (!nama_prodi || nama_prodi.trim().length < 3) {
    return res.status(400).json({ error: 'Nama prodi minimal 3 karakter' });
  }

  try {
    const { data, error } = await supabase
      .from('master_prodi')
      .update({ nama_prodi: nama_prodi.trim() })
      .eq('id_prodi', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Prodi berhasil diupdate', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteProdi = async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete - set deleted_at
    const { data, error } = await supabase
      .from('master_prodi')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id_prodi', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Prodi berhasil dihapus (soft delete)', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===================================================================
// KATEGORI
// ===================================================================

exports.getAllKategori = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('master_kategori')
      .select('*')
      .is('deleted_at', null) // Soft delete filter
      .order('nama_kategori', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil kategori' });
  }
};

exports.createKategori = async (req, res) => {
  const { nama_kategori } = req.body;

  if (!nama_kategori || nama_kategori.trim().length < 2) {
    return res.status(400).json({ error: 'Nama kategori minimal 2 karakter' });
  }

  try {
    const { data, error } = await supabase
      .from('master_kategori')
      .insert({ nama_kategori: nama_kategori.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Kategori dengan nama tersebut sudah ada' });
      }
      throw error;
    }
    res.status(201).json({ message: 'Kategori berhasil ditambahkan', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateKategori = async (req, res) => {
  const { id } = req.params;
  const { nama_kategori } = req.body;

  if (!nama_kategori || nama_kategori.trim().length < 2) {
    return res.status(400).json({ error: 'Nama kategori minimal 2 karakter' });
  }

  try {
    const { data, error } = await supabase
      .from('master_kategori')
      .update({ nama_kategori: nama_kategori.trim() })
      .eq('id_kategori', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Kategori berhasil diupdate', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteKategori = async (req, res) => {
  const { id } = req.params;

  try {
    // Soft delete
    const { data, error } = await supabase
      .from('master_kategori')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id_kategori', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: 'Kategori berhasil dihapus (soft delete)', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};