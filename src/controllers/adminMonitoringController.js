const { supabase } = require('../config/supabaseClient');

exports.getMonitoringPosts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = 'all',
            type = 'all',
            dateFrom = '',
            dateTo = ''
        } = req.query;

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        // 1. Build Query
        // Join:
        // - akun_pengguna (pelapor)
        // - master_kategori
        // - data_klaim (info klaim) -> join akun_pengguna (pengklaim)
        let query = supabase
            .from('postingan_barang')
            .select(`
        *,
        pelapor:akun_pengguna!id_pelapor (
          id_pengguna,
          nama_lengkap,
          status_akun,
          master_roles (
             nama_role
          )
        ),
        kategori:master_kategori (
          id_kategori,
          nama_kategori
        ),
        klaim:data_klaim (
          id_klaim,
          status_klaim:tindakan_validasi, 
          tgl_klaim,
          file_bukti,
          catatan_validasi,
          pengklaim:akun_pengguna!id_pemilik (
            nama_lengkap
          )
        )
      `, { count: 'exact' });

        // 2. Apply Filters

        // SEARCH (Nama Barang / Nama Pelapor)
        // Note: Searching joined tables in Supabase requires tricky syntax or just search on main table first.
        // For simplicity & performance, we search on 'nama_barang' OR 'deskripsi'.
        // If we want to search Pelapor Name, Supabase doesn't support ILIKE on foreign tables easily in JS client yet without complex RPC.
        // We will stick to searching Post content first.
        if (search) {
            query = query.or(`nama_barang.ilike.%${search}%,deskripsi.ilike.%${search}%`);
        }

        // FILTER STATUS
        if (status && status !== 'all') {
            query = query.eq('status_postingan', status);
        }

        // FILTER TIPE
        if (type && type !== 'all') {
            query = query.eq('tipe_postingan', type);
        }

        // FILTER TANGGAL
        if (dateFrom) {
            query = query.gte('tgl_postingan', dateFrom); // Start 00:00
        }
        if (dateTo) {
            // Add 1 day or make sure string includes time to cover the whole day
            // Assuming YYYY-MM-DD, we can use .lte(dateTo + ' 23:59:59')
            query = query.lte('tgl_postingan', `${dateTo} 23:59:59`);
        }

        // 3. Execution
        const { data, error, count } = await query
            .order('tgl_postingan', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // 4. Data Transformation (Optional mapping if needed)
        // Supabase returns 'klaim' as an array. We usually want the latest active/relevant claim.
        // But for monitoring multiple claims history, Array is fine.
        // Let's just return raw data for now, FE will map it.

        res.json({
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total_items: count,
                total_pages: Math.ceil(count / limit)
            }
        });

    } catch (error) {
        console.error("Monitoring Error:", error);
        res.status(500).json({ error: error.message });
    }
};
