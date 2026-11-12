// Perhitungan untuk halaman Beranda: saldo harian, perkiraan akhir bulan,
// perkiraan gajian, dan ringkasan pengeluaran. Semua tanggal memakai waktu lokal
// (string YYYY-MM-DD), bukan toISOString(), agar tidak bergeser di zona WIB.
import { EXCHANGE_RATES } from './utils';

const pad = (n) => String(n).padStart(2, '0');
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const DAY_MS = 86400000;
export const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);

/** Nominal transaksi dalam rupiah (akun valas dikonversi). */
export const toIdr = (t) => Number(t.amount || 0) * (EXCHANGE_RATES[t.accounts?.currency || 'IDR'] || 1);

/** Transfer antar akun sendiri bukan pemasukan/pengeluaran. */
export const realTransactions = (list) => list.filter((t) => !t.transfer_type);

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
};

const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Perkiraan gajian berikutnya.
 * 1. Tagihan rutin bertipe pemasukan (paling akurat, diisi pengguna sendiri).
 * 2. Pola dari riwayat: pemasukan dengan keterangan sama yang muncul di minimal
 *    2 dari 3 bulan terakhir pada tanggal yang mirip.
 */
export function detectPayday(history, recurringBills, today) {
  const todayStr = ymd(today);
  const recurring = recurringBills
    .filter((b) => b.is_active && b.type === 'income' && b.next_due && b.next_due >= todayStr)
    .sort((a, b) => a.next_due.localeCompare(b.next_due))[0];
  if (recurring) {
    return { date: parseYmd(recurring.next_due), amount: Number(recurring.amount || 0), name: recurring.name };
  }

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const from = ymd(new Date(today.getFullYear(), today.getMonth() - 3, 1));
  const groups = new Map();
  realTransactions(history)
    .filter((t) => t.type === 'income' && t.date >= from && t.date < ymd(monthStart))
    .forEach((t) => {
      const key = normalize(t.description) || `cat:${t.category_id}`;
      const g = groups.get(key) || { name: t.description || t.categories?.name || 'Pemasukan', months: new Set(), days: [], amounts: [] };
      g.months.add(t.date.slice(0, 7));
      g.days.push(Number(t.date.slice(8, 10)));
      g.amounts.push(toIdr(t));
      groups.set(key, g);
    });

  const candidates = [...groups.entries()]
    .filter(([, g]) => g.months.size >= 2 && Math.max(...g.days) - Math.min(...g.days) <= 3)
    .map(([key, g]) => ({ key, name: g.name, day: median(g.days), amount: median(g.amounts) }))
    .sort((a, b) => b.amount - a.amount);
  const best = candidates[0];
  if (!best) return null;

  // Sudah diterima bulan ini? Kalau ya, gajian berikutnya bulan depan.
  const receivedThisMonth = realTransactions(history).some((t) =>
    t.type === 'income' && t.date >= ymd(monthStart) && (normalize(t.description) || `cat:${t.category_id}`) === best.key);
  const dateIn = (offset) => {
    const lastDay = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0).getDate();
    return new Date(today.getFullYear(), today.getMonth() + offset, Math.min(best.day, lastDay));
  };
  let date = dateIn(0);
  if (receivedThisMonth || startOfDay(date) < startOfDay(today)) date = dateIn(1);
  return { date, amount: best.amount, name: best.name };
}

/** Pengeluaran hari ini, minggu ini (mulai Senin), bulan ini, dan tahun ini. */
export function spendTotals(history, today) {
  const todayStr = ymd(today);
  const weekStart = ymd(addDays(today, -((today.getDay() + 6) % 7)));
  const monthStart = todayStr.slice(0, 8) + '01';
  const yearStart = `${today.getFullYear()}-01-01`;
  const totals = { today: 0, week: 0, month: 0, year: 0 };
  realTransactions(history).forEach((t) => {
    if (t.type !== 'expense' || t.date > todayStr || t.date < yearStart) return;
    const v = toIdr(t);
    totals.year += v;
    if (t.date >= monthStart) totals.month += v;
    if (t.date >= weekStart) totals.week += v;
    if (t.date === todayStr) totals.today += v;
  });
  return totals;
}

/** Pemasukan & pengeluaran per bulan, `count` bulan terakhir (bulan ini paling kanan). */
export function monthlyFlow(history, today, count = 12) {
  const fmt = new Intl.DateTimeFormat('id-ID', { month: 'short' });
  const real = realTransactions(history);
  return Array.from({ length: count }, (_, i) => {
    const m = new Date(today.getFullYear(), today.getMonth() - (count - 1 - i), 1);
    const key = `${m.getFullYear()}-${pad(m.getMonth() + 1)}`;
    let income = 0;
    let expense = 0;
    real.forEach((t) => {
      if (!t.date.startsWith(key)) return;
      if (t.type === 'income') income += toIdr(t);
      else if (t.type === 'expense') expense += toIdr(t);
    });
    return { key, label: fmt.format(m).replace('.', ''), income, expense };
  });
}

/**
 * Saldo total per hari dari `start` sampai akhir bulan.
 * - Sampai hari ini: dihitung mundur dari saldo sekarang memakai riwayat transaksi.
 * - Setelah hari ini: perkiraan = saldo − rata-rata belanja harian − tagihan rutin
 *   + gajian, sehingga terlihat kapan saldo turun/naik.
 */
export function buildBalanceSeries({ history, totalBalance, recurringBills, payday, today, days = 35 }) {
  const real = realTransactions(history);
  const start = addDays(today, -days);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const todayStr = ymd(today);

  // Perubahan bersih per tanggal
  const netByDay = new Map();
  real.forEach((t) => {
    const delta = t.type === 'income' ? toIdr(t) : t.type === 'expense' ? -toIdr(t) : 0;
    netByDay.set(t.date, (netByDay.get(t.date) || 0) + delta);
  });

  // Saldo akhir hari D = saldo sekarang − perubahan setelah hari D
  const past = [];
  let running = totalBalance;
  for (let d = startOfDay(today); d >= start; d = addDays(d, -1)) {
    const key = ymd(d);
    past.push({ key, date: d, value: running, future: false });
    running -= netByDay.get(key) || 0;
  }
  // Transaksi bertanggal di masa depan (jarang) dianggap sudah masuk saldo sekarang
  past.reverse();

  // Rata-rata belanja harian 28 hari terakhir, tanpa pembayaran tagihan rutin
  // (tagihan dihitung terpisah pada tanggal jatuh temponya)
  const bills = recurringBills.filter((b) => b.is_active && b.next_due);
  const billNames = bills.filter((b) => b.type !== 'income').map((b) => normalize(b.name)).filter(Boolean);
  const from28 = ymd(addDays(today, -27));
  const spent28 = real
    .filter((t) => t.type === 'expense' && t.date >= from28 && t.date <= todayStr)
    .filter((t) => {
      const desc = normalize(t.description);
      return !desc.startsWith('auto-pay') && !billNames.some((n) => desc.includes(n));
    })
    .reduce((s, t) => s + toIdr(t), 0);
  const dailySpend = spent28 / 28;

  const events = [];
  const endStr = ymd(end);
  bills.forEach((b) => {
    if (b.next_due <= todayStr || b.next_due > endStr) return;
    events.push({ key: b.next_due, type: b.type === 'income' ? 'payday' : 'bill', amount: Number(b.amount || 0), name: b.name });
  });
  if (payday) {
    const key = ymd(payday.date);
    const already = events.some((e) => e.type === 'payday' && e.key === key);
    if (!already && key > todayStr && key <= endStr) {
      events.push({ key, type: 'payday', amount: payday.amount, name: payday.name });
    }
  }

  const future = [];
  let projected = totalBalance;
  for (let d = addDays(today, 1); d <= end; d = addDays(d, 1)) {
    const key = ymd(d);
    projected -= dailySpend;
    events.filter((e) => e.key === key).forEach((e) => {
      projected += e.type === 'payday' ? e.amount : -e.amount;
    });
    future.push({ key, date: d, value: projected, future: true });
  }

  return { points: [...past, ...future], todayIndex: past.length - 1, events, endValue: projected, endDate: end, dailySpend };
}

/** Perubahan saldo total dibanding tanggal yang sama bulan lalu (persen), atau null. */
export function balanceChange(history, totalBalance, today) {
  const ago = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  const agoStr = ymd(ago);
  const net = realTransactions(history)
    .filter((t) => t.date > agoStr && t.date <= ymd(today))
    .reduce((s, t) => s + (t.type === 'income' ? toIdr(t) : t.type === 'expense' ? -toIdr(t) : 0), 0);
  const before = totalBalance - net;
  if (before <= 0) return null;
  return ((totalBalance - before) / before) * 100;
}

const WORDS = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'];
/** "Dua tagihan" — angka kecil ditulis dengan huruf, seperti kalimat biasa. */
export const countWord = (n, capitalize = false) => {
  const word = n <= 10 ? WORDS[n] : String(n);
  return capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
};
