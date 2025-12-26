require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

// Prioritaskan SERVICE_KEY untuk Backend agar bisa bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (process.env.SUPABASE_SERVICE_KEY) {
  console.log('✅ [Backend] Menggunakan SUPABASE_SERVICE_KEY (Admin Mode)');

  // CHECK: Pastikan user tidak salah copy paste (Service Key tidak boleh sama dengan Anon Key)
  if (process.env.SUPABASE_SERVICE_KEY === process.env.VITE_SUPABASE_ANON_KEY) {
    console.error('🚨 [CRITICAL WARNING] SUPABASE_SERVICE_KEY Anda SAMA dengan VITE_SUPABASE_ANON_KEY!');
    console.error('👉 Mohon ganti SUPABASE_SERVICE_KEY di .env dengan "service_role" key dari Dashboard Supabase (Settings > API).');
    console.error('   Kunci "service_role" biasanya berbeda dari "anon" key.');
  }
} else {
  console.warn('⚠️ [Backend] Warning: SUPABASE_SERVICE_KEY tidak ditemukan. Menggunakan Anon Key. Notifikasi mungkin gagal karena RLS.');
}

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL atau Key tidak ditemukan di .env backend!');
}

// Opsi auth khusus untuk backend service
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// KHUSUS UNTUK ADMIN/SERVICE ROLE (Bypass RLS)
// Kita buat instance terpisah agar tidak "tercemar" saat ada user login
const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY || supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

module.exports = { supabase, supabaseAdmin };