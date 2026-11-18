// POST /api/shortcut — dipanggil Shortcut iPhone "Catat ke FinanceMe" (ketuk 2x bagian belakang iPhone).
//
// Body JSON: { "token": "fm_…", "text": "<teks hasil Ekstrak Teks dari Gambar>", "dry_run"?: true }
// Balasan: teks biasa untuk ditampilkan sebagai notifikasi di iPhone
// (atau JSON bila ?format=json — dipakai tombol "Uji coba" di Pengaturan).
//
// Butuh skrip supabase_step14_iphone_shortcut.sql sudah dijalankan di Supabase.
import { parseReceipt, summarize } from '../server/shortcutReceipt.js';
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from '../src/lib/supabaseDefaults.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
const MAX_TEXT = 8000;

const MSG = {
  noToken: 'Token FinanceMe belum diisi di Shortcut. Salin token dari Pengaturan → Pintasan iPhone.',
  badToken: 'Token FinanceMe tidak valid. Buat token baru di Pengaturan → Pintasan iPhone, lalu ganti token di Shortcut.',
  noText: 'Tidak ada teks yang terbaca dari layar. Ketuk saat layar "Pembayaran berhasil" tampil.',
  notReady: 'Fitur Pintasan iPhone belum aktif: jalankan supabase_step14_iphone_shortcut.sql di Supabase.',
  noAi: 'AI FinanceMe belum dikonfigurasi di server (GEMINI_API_KEY).',
  aiDown: 'AI sedang tidak bisa membaca layar. Coba ketuk lagi sebentar lagi.',
  // Kuota harian Gemini tier gratis direset tengah malam waktu Pasifik (±14.00–15.00 WIB)
  aiQuota: 'Kuota AI (Gemini) hari ini sudah habis, reset sekitar pukul 14.00–15.00 WIB. Catat manual dulu di FinanceMe.',
  dbDown: 'Tidak bisa terhubung ke database FinanceMe. Coba lagi sebentar lagi.',
};

class RpcError extends Error {
  constructor(name, status, body) {
    super(`rpc ${name} → ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function rpc(name, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(10000),
  });
  const text = await res.text();
  if (!res.ok) throw new RpcError(name, res.status, text.slice(0, 300));
  return text ? JSON.parse(text) : null;
}

// PostgREST: fungsi belum dibuat → 404 / PGRST202
const isMissingFunction = (e) => e instanceof RpcError && (e.status === 404 || /PGRST202|Could not find the function/i.test(e.body));

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

export default async function handler(req, res) {
  const asJson = req.query?.format === 'json';
  const reply = (status, message, extra = {}) => {
    res.setHeader('Cache-Control', 'no-store');
    if (asJson) return res.status(status).json({ ok: status < 300, message, ...extra });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(status).send(message);
  };

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(405, 'Endpoint ini untuk Shortcut iPhone "Catat ke FinanceMe" (POST).');
  }

  const body = readBody(req);
  const token = String(body.token || '').trim();
  const text = String(body.text || '').slice(0, MAX_TEXT).trim();
  const dryRun = body.dry_run === true || body.dryRun === true;
  if (!token) return reply(401, MSG.noToken, { reason: 'no_token' });
  if (!text) return reply(400, MSG.noText, { reason: 'no_text' });

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return reply(500, MSG.noAi, { reason: 'no_ai' });

  let context;
  try {
    context = await rpc('shortcut_context', { p_token: token });
  } catch (e) {
    if (isMissingFunction(e)) return reply(503, MSG.notReady, { reason: 'not_ready' });
    console.error('shortcut_context', e.message, e.body);
    return reply(502, MSG.dbDown, { reason: 'db' });
  }
  if (!context) return reply(401, MSG.badToken, { reason: 'bad_token' });

  let parsed;
  try {
    parsed = await parseReceipt({
      text,
      accounts: context.accounts || [],
      categories: context.categories || [],
      today: context.today,
      apiKey,
    });
  } catch (e) {
    console.error('parseReceipt', e?.message?.slice(0, 300));
    if (/RESOURCE_EXHAUSTED|\b429\b|quota/i.test(String(e?.message))) {
      return reply(503, MSG.aiQuota, { reason: 'ai_quota' });
    }
    return reply(502, MSG.aiDown, { reason: 'ai' });
  }
  if (!parsed.ok) return reply(422, parsed.message, { reason: parsed.reason });

  const preview = {
    type: parsed.type,
    amount: parsed.amount,
    description: parsed.description,
    account: parsed.account.name,
    category: parsed.category?.name || null,
    date: parsed.date || context.today,
  };
  if (dryRun) {
    return reply(200, `Uji coba berhasil (tidak disimpan): ${summarize(parsed)}`, { reason: 'dry_run', preview });
  }

  let result;
  try {
    result = await rpc('shortcut_add_transaction', {
      p_token: token,
      p_type: parsed.type,
      p_amount: parsed.amount,
      p_description: parsed.description,
      p_account_id: parsed.account.id,
      p_category_id: parsed.category?.id ?? null,
      p_date: parsed.date,
      p_dedup_key: parsed.dedupKey,
    });
  } catch (e) {
    if (isMissingFunction(e)) return reply(503, MSG.notReady, { reason: 'not_ready' });
    console.error('shortcut_add_transaction', e.message, e.body);
    return reply(502, MSG.dbDown, { reason: 'db' });
  }

  switch (result?.status) {
    case 'ok':
      return reply(200, `Tercatat: ${summarize(parsed)}`, { reason: 'ok', preview, transactionId: result.transaction_id });
    case 'duplicate':
      return reply(200, `Sudah tercatat sebelumnya: ${summarize(parsed)}`, { reason: 'duplicate', preview });
    case 'unauthorized':
      return reply(401, MSG.badToken, { reason: 'bad_token' });
    case 'invalid_account':
      return reply(422, 'Akun yang terbaca tidak ditemukan di FinanceMe. Periksa daftar akun Anda.', { reason: 'invalid_account' });
    default:
      return reply(422, 'Data transaksi dari layar tidak valid, jadi tidak dicatat.', { reason: 'invalid' });
  }
}
