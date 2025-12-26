const { supabase } = require('../config/supabaseClient');

// Helper untuk mengambil detail spesifik berdasarkan role
const getSpecificProfile = async (id_pengguna, id_role) => {
  if (id_role === 1) { // Mahasiswa
    return supabase.from('profil_mahasiswa').select('*, master_prodi(nama_prodi)').eq('id_user', id_pengguna).single();
  } else if (id_role === 2) { // Dosen
    return supabase.from('profil_dosen').select('*, master_prodi(nama_prodi)').eq('id_user', id_pengguna).single();
  } else if (id_role === 3) { // Satpam
    return supabase.from('profil_satpam').select('*').eq('id_user', id_pengguna).single();
  }
  return { data: null };
};

exports.getProfile = async (req, res) => {
  const { authId } = req.query; // Kita cari berdasarkan Auth ID (UUID)

  try {
    // 1. Ambil data Akun Utama + Nama Role
    const { data: user, error } = await supabase
      .from('akun_pengguna')
      .select(`
        *,
        master_roles ( nama_role )
      `)
      .eq('auth_id', authId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // 2. Ambil data spesifik (NPM/NIDN, Prodi, dll)
    const { data: specificData } = await getSpecificProfile(user.id_pengguna, user.id_role);

    // 3. Gabungkan data untuk dikirim ke Frontend
    const fullProfile = {
      ...user,
      role_name: user.master_roles.nama_role, // "mahasiswa", "dosen", "satpam"
      specific: specificData || {} // Data NPM, Prodi, Lokasi Jaga ada di sini
    };

    res.json(fullProfile);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { authId, commonData, specificData } = req.body;

  try {
    // 1. Cari ID Pengguna Integer dulu
    const { data: user } = await supabase.from('akun_pengguna').select('id_pengguna, id_role').eq('auth_id', authId).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    // 2. Update Tabel Utama (akun_pengguna)
    if (commonData) {
      const { error } = await supabase.from('akun_pengguna').update(commonData).eq('auth_id', authId);
      if (error) throw error;
    }

    // 3. Update Tabel Spesifik
    if (specificData) {
      let table = '';
      if (user.id_role === 1) table = 'profil_mahasiswa';
      else if (user.id_role === 2) table = 'profil_dosen';
      else if (user.id_role === 3) table = 'profil_satpam';

      if (table) {
        const { error: specError } = await supabase.from(table).update(specificData).eq('id_user', user.id_pengguna);
        if (specError) throw specError;
      }
    }

    res.json({ message: 'Profil berhasil diperbarui' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};