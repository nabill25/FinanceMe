import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Sebelumnya URL project asli dibandingkan dengan dirinya sendiri, sehingga hasilnya selalu false
// dan banner "Perlu konfigurasi Supabase!" selalu muncul. Yang perlu ditolak hanyalah nilai placeholder.
export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project');

// Use placeholder values to avoid crash — real calls will still fail gracefully
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://tdszqodqspwddcnywesl.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkc3pxb2Rxc3B3ZGRjbnl3ZXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTQ0NDYsImV4cCI6MjA5OTg5MDQ0Nn0.ZOwk-hg4jQlpz7v6WTUAeFgJQw2yPuutuLXZJRtyFUg'
);
