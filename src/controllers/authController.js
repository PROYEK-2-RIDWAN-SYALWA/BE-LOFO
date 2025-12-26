const { supabase } = require('../config/supabaseClient');

// ... (Biarkan fungsi helper getRoleId dan exports.register tetap ada di atas) ...
// Helper: Mapping Role String ke ID Integer (Biarkan kode lama)
const getRoleId = (roleName) => {
  switch (roleName) {
    case 'mahasiswa': return 1;
    case 'dosen': return 2;
    case 'satpam': return 3;
    default: return 1;
  }
};

exports.register = async (req, res) => {
  // ... (Biarkan kode register Anda yang lama disini, jangan dihapus) ...
  // Kita fokus menambahkan fungsi login di bawah ini
  const { email, password, role, nama_lengkap, no_wa, username, specific_data } = req.body;

  try {
    // 1. Validasi Username (Cek apakah sudah dipakai)
    const { data: existingUser } = await supabase
      .from('akun_pengguna')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Username sudah digunakan, silakan pilih yang lain.' });
    }

    // 2. DAFTAR KE SUPABASE AUTH (Tetap pakai email & password)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Gagal membuat user auth");

    const userId = authData.user.id;
    const roleId = getRoleId(role);

    // 3. SIMPAN KE TABEL UTAMA (akun_pengguna)
    const { data: userData, error: userError } = await supabase
      .from('akun_pengguna')
      .insert([{
        auth_id: userId,
        id_role: roleId,
        username: username, // <--- Simpan Username Manual
        email: email,       // <--- Simpan Email juga (penting untuk login via username)
        nama_lengkap,
        no_wa,
        status_akun: 'pending' // User baru menunggu verifikasi admin
      }])
      .select('id_pengguna')
      .single();

    if (userError) {
      // Hapus user auth jika gagal simpan data profil (Rollback)
      await supabase.auth.admin.deleteUser(userId);
      throw userError;
    }

    const idPengguna = userData.id_pengguna;

    // 4. SIMPAN KE TABEL PROFIL SPESIFIK
    let profileError = null;

    if (role === 'mahasiswa') {
      const { error } = await supabase.from('profil_mahasiswa').insert([{
        id_user: idPengguna,
        npm: specific_data.npm,
        id_prodi: parseInt(specific_data.prodi), // UBAH DISINI: pastikan integer & nama kolom sesuai DB
        angkatan: specific_data.angkatan
      }]);
      profileError = error;
    }
    else if (role === 'dosen') {
      const { error } = await supabase.from('profil_dosen').insert([{
        id_user: idPengguna,
        nidn: specific_data.nidn,
        id_prodi: parseInt(specific_data.prodi) // UBAH DISINI: pastikan integer
      }]);
      profileError = error;
    }
    else if (role === 'satpam') {
      const { error } = await supabase.from('profil_satpam').insert([{
        id_user: idPengguna,
        nomor_induk: specific_data.nomor_induk,
        lokasi_jaga: specific_data.lokasi_jaga
      }]);
      profileError = error;
    }

    if (profileError) throw profileError;

    res.status(201).json({ message: 'Registrasi berhasil!', user: authData.user });

  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(400).json({ error: error.message });
  }
};

// === FUNGSI BARU: LOGIN AMAN ===
exports.login = async (req, res) => {
  const { identifier, password } = req.body; // identifier bisa Username atau Email

  try {
    let emailToLogin = identifier;

    // 1. Jika tidak mengandung '@', anggap sebagai Username
    if (!identifier.includes('@')) {
      // Cari email berdasarkan username.
      // Karena pakai SERVICE_KEY, ini bisa baca meski RLS tabel 'akun_pengguna' di-set Private.
      const { data: userRecord, error: searchError } = await supabase
        .from('akun_pengguna')
        .select('email')
        .eq('username', identifier)
        .single();

      if (searchError || !userRecord) {
        // Return error generik agar hacker tidak bisa menebak username valid atau tidak
        // Tapi untuk development, pesan spesifik membantu. 
        // Best practice: "Kredensial salah"
        return res.status(401).json({ error: 'Username atau password salah.' });
      }

      emailToLogin = userRecord.email;
    }

    // 2. Login ke Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToLogin,
      password: password
    });

    if (error) throw error;

    // 3. Kirim Token Sesi ke Frontend
    res.status(200).json({
      message: 'Login Berhasil',
      session: data.session, // Access Token & Refresh Token
      user: data.user
    });

  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(401).json({ error: 'Login Gagal: Periksa username/email dan password Anda.' });
  }
};