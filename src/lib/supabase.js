import { createClient } from '@supabase/supabase-js';

// Project Supabase FinanceMe (sama dengan .env.local). Dipakai bila VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY tidak diset — seperti di Vercel saat ini. Anon key memang ikut
// terkirim ke browser, jadi bukan rahasia.
const DEFAULT_URL = 'https://tdszqodqspwddcnywesl.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkc3pxb2Rxc3B3ZGRjbnl3ZXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTQ0NDYsImV4cCI6MjA5OTg5MDQ0Nn0.ZOwk-hg4jQlpz7v6WTUAeFgJQw2yPuutuLXZJRtyFUg';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

// Banner "Perlu konfigurasi Supabase!" hanya untuk nilai contoh dari template .env.
// Sebelumnya banner juga muncul di situs produksi (karena env tidak diset di Vercel),
// padahal aplikasi tersambung normal ke project bawaan di atas.
export const isSupabaseConfigured =
  !!supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
