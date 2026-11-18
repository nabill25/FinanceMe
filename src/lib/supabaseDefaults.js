// Project Supabase FinanceMe (sama dengan .env.local). Dipakai bila VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY tidak diset — seperti di Vercel saat ini. Anon key memang ikut
// terkirim ke browser, jadi bukan rahasia. Dipakai bersama oleh aplikasi (src/lib/supabase.js)
// dan server (api/shortcut.js).
export const DEFAULT_SUPABASE_URL = 'https://tdszqodqspwddcnywesl.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkc3pxb2Rxc3B3ZGRjbnl3ZXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTQ0NDYsImV4cCI6MjA5OTg5MDQ0Nn0.ZOwk-hg4jQlpz7v6WTUAeFgJQw2yPuutuLXZJRtyFUg';
