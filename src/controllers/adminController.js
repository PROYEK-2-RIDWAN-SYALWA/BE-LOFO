const supabase = require('../config/supabaseClient');
const { createNotificationInternal } = require('./notificationController');


// 1. LIHAT SEMUA USER (Dengan Filter Status)
exports.getAllUsers = async (req, res) => {
  const { status = 'all' } = req.query;
  
  try {
    let query = supabase
      .from('akun_pengguna')
      .select(`
        *,
        master_roles ( nama_role )
      `);

    // Filter by status jika bukan 'all'
    if (status !== 'all') {
      query = query.eq('status_akun', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. VERIFIKASI USER (REVISI FIX)
exports.verifyUser = async (req, res) => {
  // [PERBAIKAN UTAMA] Gunakan 'id_pengguna', JANGAN 'id'
  const { id_pengguna } = req.params; 

  try {
    // Validasi input
    if (!id_pengguna || id_pengguna === 'undefined') {
        return res.status(400).json({ error: "ID Pengguna tidak valid." });
    }

    // 1. Update Status
    const { data: userUpdated, error } = await supabase
      .from('akun_pengguna')
      .update({ status_akun: 'verified' })
      .eq('id_pengguna', id_pengguna) // Pastikan variabel ini sama dengan yang di atas
      .select()
      .single();

    if (error) throw error;

    // 2. Kirim Notifikasi (Jika user ditemukan & punya auth_id)
    if (userUpdated && userUpdated.auth_id) {
        if (typeof createNotificationInternal === 'function') {
            await createNotificationInternal(
                userUpdated.auth_id,
                'Akun Terverifikasi! 🎉',
                'Selamat! Akun Anda telah diverifikasi oleh Admin. Sekarang Anda bisa memposting laporan.',
                'success'
            );
        }
    }

    res.json({ message: 'User berhasil diverifikasi dan dinotifikasi', data: userUpdated });

  } catch (err) {
    console.error("Verify Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 2.5 TOLAK USER (BARU)
exports.rejectUser = async (req, res) => {
  const { id_pengguna } = req.params;
  const { alasan } = req.body;

  try {
    if (!id_pengguna || id_pengguna === 'undefined') {
      return res.status(400).json({ error: "ID Pengguna tidak valid." });
    }

    // Update Status menjadi rejected
    const { data: userUpdated, error } = await supabase
      .from('akun_pengguna')
      .update({ 
        status_akun: 'rejected'
        // Bisa tambah kolom alasan_penolakan jika ada di database
      })
      .eq('id_pengguna', id_pengguna)
      .select()
      .single();

    if (error) throw error;

    // Kirim Notifikasi
    if (userUpdated && userUpdated.auth_id) {
      await createNotificationInternal(
        userUpdated.auth_id,
        'Akun Tidak Disetujui ❌',
        `Maaf, akun Anda tidak disetujui oleh Admin.${alasan ? ` Alasan: ${alasan}` : ''} Silakan hubungi admin untuk informasi lebih lanjut.`,
        'error'
      );
    }

    res.json({ message: 'User berhasil ditolak', data: userUpdated });

  } catch (err) {
    console.error("Reject User Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 2.6 DETAIL USER DENGAN PROFIL LENGKAP (BARU)
exports.getUserDetail = async (req, res) => {
  const { id_pengguna } = req.params;

  try {
    // Ambil data user utama
    const { data: user, error: userError } = await supabase
      .from('akun_pengguna')
      .select(`
        *,
        master_roles ( nama_role )
      `)
      .eq('id_pengguna', id_pengguna)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }

    // Ambil profil spesifik berdasarkan role
    let specificProfile = null;
    const roleName = user.master_roles?.nama_role || '';

    if (roleName === 'mahasiswa') {
      const { data } = await supabase
        .from('profil_mahasiswa')
        .select('*, master_prodi(nama_prodi)')
        .eq('id_pengguna', id_pengguna)
        .single();
      specificProfile = data;
    } else if (roleName === 'dosen') {
      const { data } = await supabase
        .from('profil_dosen')
        .select('*, master_prodi(nama_prodi)')
        .eq('id_pengguna', id_pengguna)
        .single();
      specificProfile = data;
    } else if (roleName === 'satpam') {
      const { data } = await supabase
        .from('profil_satpam')
        .select('*')
        .eq('id_pengguna', id_pengguna)
        .single();
      specificProfile = data;
    }

    res.json({
      ...user,
      specific: specificProfile
    });

  } catch (err) {
    console.error("Get User Detail Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 3. HAPUS POSTINGAN (Moderasi Konten)
exports.deletePost = async (req, res) => {
  const { id_postingan } = req.params;
  const idInt = parseInt(id_postingan); // 1. Paksa jadi Integer agar akurat

  console.log(`[DELETE] Request hapus ID: ${id_postingan} (Parsed: ${idInt})`);

  try {
    // [LANGKAH 1] Cek apakah data benar-benar ada?
    const { data: post, error: fetchError } = await supabase
      .from('postingan_barang')
      .select('id_postingan, foto_barang')
      .eq('id_postingan', idInt)
      .maybeSingle(); // Pakai maybeSingle agar tidak error jika null

    if (fetchError) {
        console.error("[DELETE] Error saat cek data:", fetchError.message);
        return res.status(500).json({ error: "Database error saat cek data." });
    }
    
    if (!post) {
        console.warn("[DELETE] Data tidak ditemukan di database (Ghost Data).");
        // Kita kirim sukses saja supaya UI frontend bisa refresh dan menghilangkan data hantu ini
        return res.json({ message: 'Data sudah tidak ada, sinkronisasi selesai.' });
    }

    // [LANGKAH 2] Hapus Gambar (Bersih-bersih Storage)
    if (post.foto_barang && post.foto_barang.includes('lofo-images')) {
      try {
        const path = post.foto_barang.split('/lofo-images/')[1];
        if (path) await supabase.storage.from('lofo-images').remove([path]);
      } catch (e) { /* Ignore parsing error */ }
    }

    // [LANGKAH 3] Hapus Semua Anak/Relasi (Foreign Keys)
    // Kita gunakan Promise.all agar efisien
    await Promise.all([
      supabase.from('data_klaim').delete().eq('id_postingan', idInt),
      supabase.from('notifikasi').delete().eq('id_postingan', idInt),
      // Tambahkan tabel lain jika ada, misal 'komentar'
    ]);
    
    // [LANGKAH 4] Eksekusi Hapus Utama dengan Cek Count
    const { error: deleteError, count } = await supabase
      .from('postingan_barang')
      .delete({ count: 'exact' }) // Minta laporan jumlah yang terhapus
      .eq('id_postingan', idInt);

    if (deleteError) {
      console.error("[DELETE] Gagal DB:", deleteError.message);
      // Jika error foreign key, beri pesan jelas
      if (deleteError.code === '23503') {
         return res.status(400).json({ error: "Gagal hapus: Data ini masih dipakai di tabel lain." });
      }
      throw deleteError;
    }

    console.log(`[DELETE] Hasil eksekusi: ${count} baris terhapus.`);

    if (count === 0) {
        // Ini kuncinya! Query sukses tapi 0 terhapus
        console.error("[DELETE] ANOMALI: Query sukses tapi data tidak terhapus!");
        return res.status(500).json({ error: "Server menolak menghapus data ini (Cek RLS/Permission)." });
    }

    // Sukses beneran
    res.json({ message: `Berhasil menghapus permanen (ID: ${idInt})` });

  } catch (err) {
    console.error("[DELETE] Exception:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 4. STATISTIK DASHBOARD ADMIN (YANG DIPERBAIKI)
exports.getStats = async (req, res) => {
  try {
    // a. Hitung Total User
    const { count: userCount } = await supabase
      .from('akun_pengguna')
      .select('*', { count: 'exact', head: true });

    // b. Hitung Total Postingan
    const { count: postCount } = await supabase
      .from('postingan_barang')
      .select('*', { count: 'exact', head: true });

    // c. Hitung Barang Hilang
    const { count: lostCount } = await supabase
      .from('postingan_barang')
      .select('*', { count: 'exact', head: true })
      .eq('tipe_postingan', 'kehilangan'); // Case sensitive, pastikan lowercase

    // d. [BARU] Hitung Barang Ditemukan
    const { count: foundCount } = await supabase
      .from('postingan_barang')
      .select('*', { count: 'exact', head: true })
      .or('tipe_postingan.eq.ditemukan,tipe_postingan.eq.Ditemukan'); // Handle besar kecil huruf jaga-jaga

    // e. [BARU] Hitung Postingan Pending Admin
    const { count: pendingCount } = await supabase
      .from('postingan_barang')
      .select('*', { count: 'exact', head: true })
      .eq('status_postingan', 'pending_admin');

    // Kirim response lengkap
    res.json({ 
      total_users: userCount || 0, 
      total_posts: postCount || 0,
      lost_items: lostCount || 0,
      found_items: foundCount || 0,
      pending_posts: pendingCount || 0  // <-- BARU untuk badge
    });

  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ===================================================================
// 5. GET ALL POSTS FOR ADMIN (Dengan Filter Status)
// ===================================================================
exports.getAllPostsAdmin = async (req, res) => {
  const { status = 'all', page = 1, limit = 20 } = req.query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabase
      .from('postingan_barang')
      .select(`
        *,
        akun_pengguna ( nama_lengkap, username, no_wa ),
        master_kategori ( nama_kategori )
      `, { count: 'exact' });

    // Filter by status jika bukan 'all'
    if (status !== 'all') {
      query = query.eq('status_postingan', status);
    }

    const { data, error, count } = await query
      .order('tgl_postingan', { ascending: false })
      .range(from, to);

    if (error) throw error;

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_items: count,
        total_pages: Math.ceil(count / limit)
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===================================================================
// 6. APPROVE POST - Admin menyetujui postingan
// ===================================================================
exports.approvePost = async (req, res) => {
  const { id_postingan } = req.params;
  const idInt = parseInt(id_postingan);

  try {
    // 1. Cek postingan ada dan statusnya pending
    const { data: post, error: fetchError } = await supabase
      .from('postingan_barang')
      .select('id_postingan, status_postingan, nama_barang, akun_pengguna!inner(auth_id, nama_lengkap)')
      .eq('id_postingan', idInt)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan' });
    }

    if (post.status_postingan !== 'pending_admin') {
      return res.status(400).json({ 
        error: `Postingan tidak dalam status pending. Status saat ini: ${post.status_postingan}` 
      });
    }

    // 2. Update status menjadi 'aktif'
    const { error: updateError } = await supabase
      .from('postingan_barang')
      .update({ status_postingan: 'aktif' })
      .eq('id_postingan', idInt);

    if (updateError) throw updateError;

    // 3. Kirim notifikasi ke user
    await createNotificationInternal(
      post.akun_pengguna.auth_id,
      'Postingan Disetujui! ✅',
      `Postingan "${post.nama_barang}" telah diverifikasi dan sekarang tampil di website.`,
      'success',
      `/post/${idInt}`
    );

    res.json({ message: `Postingan "${post.nama_barang}" berhasil disetujui` });

  } catch (err) {
    console.error('Approve Post Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ===================================================================
// 7. REJECT POST - Admin menolak postingan
// ===================================================================
exports.rejectPost = async (req, res) => {
  const { id_postingan } = req.params;
  const { alasan } = req.body;
  const idInt = parseInt(id_postingan);

  // Validasi alasan
  if (!alasan || alasan.trim().length < 10) {
    return res.status(400).json({ 
      error: 'Alasan penolakan wajib diisi (minimal 10 karakter)' 
    });
  }

  try {
    // 1. Cek postingan ada dan statusnya pending
    const { data: post, error: fetchError } = await supabase
      .from('postingan_barang')
      .select('id_postingan, status_postingan, nama_barang, akun_pengguna!inner(auth_id)')
      .eq('id_postingan', idInt)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({ error: 'Postingan tidak ditemukan' });
    }

    if (post.status_postingan !== 'pending_admin') {
      return res.status(400).json({ 
        error: `Postingan tidak dalam status pending. Status saat ini: ${post.status_postingan}` 
      });
    }

    // 2. Update status menjadi 'ditolak_admin'
    const { error: updateError } = await supabase
      .from('postingan_barang')
      .update({ 
        status_postingan: 'ditolak_admin',
        alasan_penolakan: alasan 
      })
      .eq('id_postingan', idInt);

    if (updateError) throw updateError;

    // 3. Kirim notifikasi ke user
    await createNotificationInternal(
      post.akun_pengguna.auth_id,
      'Postingan Ditolak ❌',
      `Postingan "${post.nama_barang}" tidak disetujui. Alasan: ${alasan}`,
      'error',
      null
    );

    res.json({ message: `Postingan ditolak dengan alasan: ${alasan}` });

  } catch (err) {
    console.error('Reject Post Error:', err);
    res.status(500).json({ error: err.message });
  }
};

