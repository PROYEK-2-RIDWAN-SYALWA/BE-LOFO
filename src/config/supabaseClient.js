require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Gunakan SERVICE_ROLE_KEY jika ingin full access, atau ANON_KEY untuk standar

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;