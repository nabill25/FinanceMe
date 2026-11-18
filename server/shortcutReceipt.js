// Membaca teks dari tangkapan layar "Pembayaran berhasil" (hasil OCR Shortcut iPhone) menjadi
// transaksi FinanceMe: nominal, jenis, merchant, akun, kategori, tanggal. Dipakai oleh api/shortcut.js.
import { GoogleGenAI } from '@google/genai';

// Pengguna menunggu notifikasi setelah mengetuk HP, jadi model tercepat yang akurat untuk
// ekstraksi didahulukan (2.5-flash ±1 detik; 3.5-flash kadang 503/menggantung saat ramai).
const MODELS = [...new Set([
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
].filter(Boolean))];
const ATTEMPT_TIMEOUT_MS = 9000;
const TOTAL_BUDGET_MS = 24000; // fungsi Vercel dibatasi 30 detik (vercel.json)

const thinkingConfigFor = (model) => {
  if (model.startsWith('gemini-2.5')) return { thinkingBudget: 0 };
  if (/^gemini-(1\.|2\.0)/.test(model)) return undefined;
  return { thinkingLevel: 'low' };
};

// Nama/merek aplikasi bank/e-wallet → id provider akun FinanceMe (ACCOUNT_PROVIDERS di src/lib/utils.js).
// Hanya merek yang khas: kata umum seperti "Kantong" atau "Saldo" dipakai banyak bank, jadi tidak dipakai
// (sempat membuat transaksi SuperBank tercatat ke akun lain). Akun "Bank Lainnya" (mis. SuperBank, neobank)
// dicocokkan lewat namanya.
// "DANA" sengaja peka huruf besar: kata "dana" biasa berarti "uang" ("Sumber dana", "Dana masuk").
const PROVIDERS = [
  { id: 'gopay', name: 'GoPay', re: /go\s?pay|gojek|gopaylater/i },
  { id: 'shopeepay', name: 'ShopeePay', re: /shopee|\bspay(later)?\b/i },
  { id: 'ovo', name: 'OVO', re: /\bovo\b/i },
  { id: 'dana', name: 'DANA', re: /\bDANA\b/ },
  { id: 'linkaja', name: 'LinkAja', re: /link\s?aja/i },
  { id: 'jago', name: 'Bank Jago', re: /\bjago\b/i },
  { id: 'superbank', name: 'SuperBank', re: /super\s?bank/i },
  { id: 'neobank', name: 'neobank', re: /neo\s?bank|bank\s?neo/i },
  { id: 'blu', name: 'blu', re: /\bblu\b|bca\s?digital/i },
  { id: 'allo', name: 'Allo Bank', re: /allo\s?bank/i },
  { id: 'krom', name: 'Krom', re: /\bkrom\b/i },
  { id: 'linebank', name: 'LINE Bank', re: /line\s?bank/i },
  { id: 'seabank', name: 'SeaBank', re: /sea\s?bank/i },
  { id: 'jenius', name: 'Jenius', re: /jenius/i },
  { id: 'bca', name: 'BCA', re: /\bbca\b/i },
  { id: 'mandiri', name: 'Mandiri', re: /livin|mandiri/i },
  { id: 'bri', name: 'BRI', re: /brimo|\bbri\b/i },
  { id: 'bni', name: 'BNI', re: /\bbni\b|wondr/i },
  { id: 'bsi', name: 'BSI', re: /\bbsi\b/i },
  { id: 'btn', name: 'BTN', re: /\bbtn\b/i },
  { id: 'cimb-niaga', name: 'CIMB Niaga', re: /cimb|octo/i },
  { id: 'danamon', name: 'Danamon', re: /danamon/i },
  { id: 'permata', name: 'PermataBank', re: /permata/i },
  { id: 'ocbc-nisp', name: 'OCBC', re: /ocbc|nyala/i },
  { id: 'maybank', name: 'Maybank', re: /maybank/i },
  { id: 'panin-bank', name: 'Panin', re: /panin/i },
];

// Kata yang selalu ada di layar bukti transaksi (Indonesia/Inggris). Penyaring awal saja; AI tetap memutuskan.
const RECEIPT_WORDS = /berhasil|sukses|success|selesai|lunas|paid|dibayar|terbayar|terkirim|diterima|kiriman|transaksi|transaction|pembayaran|payment|transfer|bayar|top\s?up|refund|bukti|struk|receipt/i;

const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

/** Semua angka yang tertulis di layar, dinormalisasi (25.000 / 25,000 / 25.000,00 → 25000).
 *  Spasi & baris baru tidak ikut, agar "Rp25.000" dan "12 Nov" tidak tergabung jadi satu angka. */
function numbersInText(text) {
  const found = new Set();
  for (const raw of text.match(/\d[\d.,]*\d|\d/g) || []) {
    // Jam ("10.09" di iPhone berbahasa Indonesia) bukan format nominal Rupiah
    if (/^\d{1,2}[.,]\d{2}$/.test(raw)) continue;
    const noCents = raw.replace(/[.,]\d{2}$/, ''); // "25.000,00" → "25.000"
    for (const v of [raw, noCents]) found.add(v.replace(/[.,]/g, ''));
  }
  return found;
}

/** Nominal dari AI: angka, atau teks "25.000" / "Rp 25.000,00" / "25000". */
function toAmount(value) {
  if (typeof value === 'number') return Math.round(value);
  const s = String(value ?? '').replace(/rp|\s/gi, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return Number(s.split(',')[0].replace(/\./g, '')); // 25.000(,00)
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) return Number(s.split('.')[0].replace(/,/g, '')); // 25,000(.00)
  if (/^\d+([.,]\d+)?$/.test(s)) return Math.round(Number(s.replace(',', '.')));
  return NaN;
}

function detectProviders(text) {
  return PROVIDERS
    .map((p) => ({ ...p, index: text.search(p.re) }))
    .filter((p) => p.index >= 0)
    .sort((a, b) => a.index - b.index);
}

function accountForProvider(accounts, provider) {
  return accounts.find((a) => a.icon === provider.id) || accounts.find((a) => provider.re.test(a.name || ''));
}

const normalizeKeyPart = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 40);

// "BUDI SANTOSO" → "Budi Santoso"; kata ≤3 huruf (mis. "ABC", "PT") dibiarkan kapital
const tidyName = (s) => (/[a-z]/.test(s) ? s : s.replace(/\p{L}+/gu, (w) => (w.length <= 3 ? w : w[0] + w.slice(1).toLowerCase())));

async function askGemini(prompt, apiKey) {
  const ai = new GoogleGenAI({ apiKey });
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError = null;
  for (const model of MODELS) {
    const remaining = deadline - Date.now();
    if (remaining < 2000) break;
    try {
      const thinkingConfig = thinkingConfigFor(model);
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          ...(thinkingConfig && { thinkingConfig }),
          abortSignal: AbortSignal.timeout(Math.min(ATTEMPT_TIMEOUT_MS, remaining)),
        },
      });
      const text = (res.text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      // API key salah tidak akan berhasil di model lain
      if (/API key not valid|API_KEY_INVALID|PERMISSION_DENIED/i.test(String(error?.message))) throw error;
    }
  }
  throw lastError || new Error('Tidak ada model Gemini yang tersedia');
}

function buildPrompt({ text, accounts, categories, today }) {
  const accountList = accounts.map((a) => `- ${a.id} | ${a.name} | ${a.type} | ${a.icon || ''}`).join('\n') || '(belum ada akun)';
  const categoryList = categories.map((c) => `- ${c.id} | ${c.name} | ${c.type}`).join('\n') || '(belum ada kategori)';
  return `Kamu membaca teks hasil OCR dari tangkapan layar aplikasi e-wallet/bank Indonesia
(GoPay, DANA, OVO, ShopeePay, LinkAja, Bank Jago, SeaBank, Jenius, BCA, dll.) yang diambil
pengguna tepat setelah transaksi. Teks bisa berantakan dan memuat jam/baterai di bilah status.

Tentukan apakah layar ini bukti transaksi yang SUDAH BERHASIL, lalu ambil datanya.
Aturan:
- is_receipt: false bila bukan bukti transaksi berhasil (gagal, pending/diproses, menu, riwayat berisi banyak transaksi, chat, dll).
- amount: total yang dibayar/diterima dalam Rupiah, angka bulat (titik = pemisah ribuan). Jangan pakai saldo, sisa saldo, poin/coins, atau cashback.
- type: "expense" untuk bayar/beli/QRIS/transfer keluar/tagihan; "income" untuk terima uang/dana masuk/refund/cashback yang masuk sebagai saldo.
- internal_transfer: true bila top up atau pindah dana antar akun milik pengguna sendiri (mis. top up GoPay dari Jago, tarik saldo ke rekening sendiri).
- merchant: nama toko atau penerima/pengirim yang singkat dan rapi (mis. "Kopi Kenangan", "Indomaret", "Budi Santoso"), tanpa awalan seperti "Pembayaran ke".
- account_id: id akun pengguna yang dipakai membayar (SUMBER dana, "dari", "metode pembayaran") atau yang menerima dana masuk. Untuk transfer keluar, bank tujuan ("ke BCA ...") BUKAN akun pengguna. Isi HANYA bila nama aplikasi/bank sumber dana tertulis di layar (mis. "GoPay Saldo", "OVO Cash", "DANA Balance", "Rekening SeaBank") dan cocok dengan daftar akun. Jangan menebak dari jenis akun atau kata umum seperti "Kantong"/"Saldo"; bila tidak tertulis, null.
- category_id: id kategori yang paling cocok dengan merchant, dari daftar kategori dengan type yang sama. null bila tidak ada yang cocok.
- date: tanggal transaksi "YYYY-MM-DD" bila tertulis di layar, selain itu null. Hari ini ${today}.
- time: jam transaksi "HH:MM" bila tertulis (bukan jam di bilah status), selain itu null.
- reference: nomor/ID transaksi atau referensi bila tertulis, selain itu null.

Akun pengguna (id | nama | jenis | provider):
${accountList}

Kategori (id | nama | type):
${categoryList}

Teks OCR:
"""
${text}
"""

Balas hanya JSON: {"is_receipt":bool,"amount":number|null,"type":"expense"|"income","internal_transfer":bool,"merchant":string|null,"account_id":string|null,"category_id":string|null,"date":string|null,"time":string|null,"reference":string|null}`;
}

const NOT_RECEIPT = { ok: false, reason: 'not_receipt', message: 'Layar ini bukan bukti pembayaran yang berhasil. Ketuk saat layar "Berhasil" tampil.' };

/**
 * @returns {Promise<{ok: true, type, amount, description, account, category, date, dedupKey, providers}
 *                 | {ok: false, reason: string, message: string}>}
 */
export async function parseReceipt({ text, accounts = [], categories = [], today, apiKey, now = new Date(), accountHint }) {
  // Layar bukti transaksi selalu memuat kata seperti ini; tanpa itu tidak perlu bertanya ke AI (hemat kuota)
  if (!RECEIPT_WORDS.test(text)) return NOT_RECEIPT;
  // Akun pilihan di Shortcut yang tidak ada di FinanceMe: beri tahu tanpa memakai kuota AI
  if (accountHint && !matchAccountByName(accounts, accountHint)) return unknownAccount(accountHint, accounts);
  const ai = await askGemini(buildPrompt({ text, accounts, categories, today }), apiKey);
  return interpretReceipt(ai, { text, accounts, categories, today, now, accountHint });
}

const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Akun FinanceMe dengan nama yang sama (huruf besar/kecil & spasi diabaikan), atau satu-satunya yang mirip. */
export function matchAccountByName(accounts, name) {
  const n = normName(name);
  if (!n) return null;
  const exact = accounts.filter((a) => normName(a.name) === n);
  if (exact.length === 1) return exact[0];
  const partial = accounts.filter((a) => {
    const an = normName(a.name);
    return an && (an.includes(n) || n.includes(an));
  });
  return partial.length === 1 ? partial[0] : null;
}

const unknownAccount = (hint, accounts) => ({
  ok: false,
  reason: 'unknown_account',
  message: `Akun "${String(hint).slice(0, 40)}" yang dipilih di Shortcut tidak ada di FinanceMe. `
    + `Samakan dengan nama di menu Akun: ${accounts.map((a) => a.name).join(', ') || '(belum ada akun)'}.`,
});

/**
 * Bagian tanpa AI: memeriksa & merapikan jawaban model menjadi transaksi.
 * Dipisah agar bisa diuji tanpa memanggil Gemini.
 * accountHint: nama akun yang dipilih pengguna di Shortcut (paling diutamakan).
 */
export function interpretReceipt(ai, { text, accounts = [], categories = [], today, now = new Date(), accountHint }) {
  const providers = detectProviders(text);
  if (!RECEIPT_WORDS.test(text) || !ai || ai.is_receipt !== true) return NOT_RECEIPT;
  const hinted = accountHint ? matchAccountByName(accounts, accountHint) : null;
  if (accountHint && !hinted) return unknownAccount(accountHint, accounts);
  if (ai.internal_transfer === true) {
    return { ok: false, reason: 'internal_transfer', message: 'Top up/pindah dana antar akun sendiri tidak dicatat otomatis. Catat lewat menu Transfer di FinanceMe.' };
  }

  const amount = toAmount(ai.amount);
  if (!Number.isFinite(amount) || amount < 100 || amount >= 1e12) {
    return { ok: false, reason: 'no_amount', message: 'Nominal pembayaran tidak terbaca. Coba lagi saat angkanya terlihat jelas.' };
  }
  // AI tidak boleh mengarang angka: nominal harus benar-benar tertulis di layar
  if (!numbersInText(text).has(String(amount))) {
    return { ok: false, reason: 'amount_not_on_screen', message: 'Nominal tidak terbaca jelas di layar. Coba lagi saat angkanya terlihat utuh.' };
  }

  const type = ai.type === 'income' ? 'income' : 'expense';

  // Akun: pilihan pengguna di Shortcut → pilihan AI bila valid → satu-satunya aplikasi bank/e-wallet
  // yang terbaca di layar (bila terbaca dua, mis. "Jago … ke BCA", jangan menebak) → satu-satunya akun
  // Pilihan AI hanya dipakai bila akun itu benar-benar tersebut di layar (AI bisa menebak dari kata umum)
  const flatText = normName(text);
  const evidenced = (acc) => {
    const byIcon = PROVIDERS.find((p) => p.id === acc.icon);
    if (byIcon && byIcon.re.test(text)) return true;
    if (PROVIDERS.some((p) => p.re.test(acc.name || '') && p.re.test(text))) return true;
    const n = normName(acc.name);
    return n.length >= 3 && flatText.includes(n);
  };
  let account = hinted || accounts.find((a) => a.id === ai.account_id && evidenced(a));
  if (!account) {
    const matches = [...new Set(providers.map((p) => accountForProvider(accounts, p)).filter(Boolean))];
    if (matches.length === 1) [account] = matches;
  }
  if (!account && accounts.length === 1) account = accounts[0];

  const description = tidyName(String(ai.merchant || '').replace(/\s+/g, ' ').trim().slice(0, 80))
    || (type === 'income' ? 'Dana masuk' : 'Pembayaran');

  if (!account) {
    // Sebutkan apa yang terbaca & akun yang ada, supaya penyebabnya langsung kelihatan di notifikasi
    const read = `Terbaca ${type === 'income' ? '+' : '−'}${rupiah(amount)} · ${description}`;
    const seen = providers.find((p) => !accountForProvider(accounts, p))?.name;
    let message;
    if (accounts.length === 0) {
      message = `${read}, tapi belum ada akun di FinanceMe. Tambahkan akun bank/e-wallet di menu Akun.`;
    } else if (seen) {
      message = `${read} dari ${seen}, tapi akun ${seen} belum ada di FinanceMe. Tambahkan di menu Akun, lalu ketuk lagi.`;
    } else {
      message = `${read}, tapi aplikasi pembayarnya tidak jelas dari layar. Akun Anda: ${accounts.map((a) => a.name).join(', ')}. `
        + 'Tambahkan pilihan akun di Shortcut (Pengaturan → Pintasan iPhone) agar selalu tepat.';
    }
    return { ok: false, reason: 'no_account', message };
  }

  const category = categories.find((c) => c.id === ai.category_id && c.type === type) || null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(ai.date || '') ? ai.date : null;
  const time = /^\d{1,2}[:.]\d{2}$/.test(ai.time || '') ? ai.time.replace('.', ':') : null;

  // Kunci anti-ganda: nomor referensi bila ada; selain itu isi transaksi + jam
  // (tanpa jam: per 10 menit, supaya dua pembelian identik di hari yang sama tetap bisa dicatat)
  const bucket = Math.floor(now.getTime() / 600000);
  const dedupKey = ai.reference && normalizeKeyPart(ai.reference).length >= 4
    ? `ref:${account.id}:${normalizeKeyPart(ai.reference)}`
    : `tx:${account.id}:${type}:${amount}:${normalizeKeyPart(description)}:${date || today}:${time || `b${bucket}`}`;

  return { ok: true, type, amount, description, account, category, date, time, dedupKey, providers: providers.map((p) => p.id) };
}

/** Ringkasan untuk notifikasi iPhone, mis. "−Rp 25.000 · Kopi Kenangan · GoPay". */
export function summarize(parsed) {
  const sign = parsed.type === 'income' ? '+' : '−';
  return [`${sign}${rupiah(parsed.amount)}`, parsed.description, parsed.account?.name].filter(Boolean).join(' · ');
}
