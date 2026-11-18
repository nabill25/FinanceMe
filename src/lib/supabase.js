import { createClient } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from './supabaseDefaults';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

// Banner "Perlu konfigurasi Supabase!" hanya untuk nilai contoh dari template .env.
// Sebelumnya banner juga muncul di situs produksi (karena env tidak diset di Vercel),
// padahal aplikasi tersambung normal ke project bawaan (supabaseDefaults.js).
export const isSupabaseConfigured =
  !!supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
