// BE-LOFO/src/config/supabaseClient.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Coba baca dua-duanya (biar aman)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL atau Key tidak ditemukan di .env backend!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;