const supabase = require('../config/supabaseClient');


// 1. LIHAT SEMUA USER
exports.getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('akun_pengguna')
      .select(`
        *,
        master_roles ( nama_role )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. VERIFIKASI USER (Ubah status jadi 'verified')
exports.verifyUser = async (req, res) => {
  const { id_pengguna } = req.params;

  try {
    const { data, error } = await supabase
      .from('akun_pengguna')
      .update({ status_akun: 'verified' })
      .eq('id_pengguna', id_pengguna)
      .select();

    if (error) throw error;
    res.json({ message: 'User berhasil diverifikasi!', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. HAPUS POSTINGAN (Moderasi Konten)
// 3. HAPUS POSTINGAN (VERSI ULTIMATE DEBUG)
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

    // Kirim response lengkap
    res.json({ 
      total_users: userCount || 0, 
      total_posts: postCount || 0,
      lost_items: lostCount || 0,
      found_items: foundCount || 0  // <-- INI YANG TADI HILANG
    });

  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: err.message });
  }
};