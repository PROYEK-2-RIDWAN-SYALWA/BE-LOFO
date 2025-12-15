// PERBAIKAN: Ubah path ke '../config/supabaseClient' dan hapus kurung kurawal {}
const supabase = require('../config/supabaseClient');

// 1. Ambil Notifikasi Milik User yang Login
exports.getMyNotifications = async (req, res) => {
  const authId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('notifikasi')
      .select('*')
      .eq('auth_id', authId)
      .order('created_at', { ascending: false }) // Terbaru diatas
      .limit(20); // Batasi 20 terakhir agar ringan

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. Tandai Notifikasi Sudah Dibaca (Single atau All)
exports.markAsRead = async (req, res) => {
  const authId = req.user.id;
  const { id } = req.params; // ID notifikasi atau 'all'

  try {
    let query = supabase.from('notifikasi').update({ is_read: true }).eq('auth_id', authId);

    if (id !== 'all') {
      query = query.eq('id_notifikasi', id);
    }

    const { data, error } = await query.select();
    if (error) throw error;

    res.json({ message: 'Notifikasi ditandai sudah dibaca', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// [INTERNAL FUNCTION] Helper untuk bikin notifikasi dari Controller lain
exports.createNotificationInternal = async (targetAuthId, judul, pesan, tipe = 'info', link = null) => {
  try {
    await supabase.from('notifikasi').insert({
      auth_id: targetAuthId,
      judul,
      pesan,
      tipe,
      link_terkait: link
    });
  } catch (err) {
    console.error("Gagal kirim notifikasi internal:", err);
  }
};