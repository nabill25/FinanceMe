import { Fragment, useEffect, useMemo, useState } from 'react';
import { Sparkles, Download, Receipt, ArrowDownLeft, ArrowUpRight, PiggyBank } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { useFinanceStore } from '../store/financeStore';
import { useAuthStore } from '../store/authStore';
import { formatCurrency, getMonthLabel, EXCHANGE_RATES } from '../lib/utils';
import { exportReportToPDF } from '../lib/exportUtils';
import { analyzeHabits } from '../lib/gemini';
import { monthlyFlow } from '../lib/overview';
import MoneyFlowCard from '../components/dashboard/MoneyFlowCard';
import './Reports.css';

// Kategori bawaan yang dihitung sebagai "kebutuhan"; sisanya "keinginan"
const NEEDS = new Set(['housing', 'bills', 'food', 'transport', 'health', 'education']);
const TABS = [
  { id: 'flow', label: 'Arus kas' },
  { id: 'spending', label: 'Pengeluaran' },
  { id: 'merchants', label: 'Merchant' },
];
const PERIODS = [
  { id: 'this', label: 'Bulan ini' },
  { id: 'last', label: 'Bulan lalu' },
  { id: '3m', label: '3 bulan' },
];
const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const shortDay = (d) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(d);
const toIdr = (t) => t.amount * (EXCHANGE_RATES[t.accounts?.currency || 'IDR'] || 1);
const inRange = (t, from, to) => t.date >= from && t.date <= to;

/** Rentang periode yang dipilih + periode pembandingnya (untuk bar arsir). */
function periodRange(id, now) {
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (id === 'last') {
    const start = addMonths(thisStart, -1);
    const prevStart = addMonths(thisStart, -2);
    return {
      from: ymd(start), to: ymd(endOfMonth(start)), prevFrom: ymd(prevStart), prevTo: ymd(endOfMonth(prevStart)),
      note: `${getMonthLabel(monthKey(start))} · arsir = ${getMonthLabel(monthKey(prevStart))}`,
    };
  }
  if (id === '3m') {
    return {
      from: ymd(addMonths(thisStart, -2)), to: ymd(now),
      prevFrom: ymd(addMonths(thisStart, -5)), prevTo: ymd(endOfMonth(addMonths(thisStart, -3))),
      note: '3 bulan terakhir · arsir = 3 bulan sebelumnya',
    };
  }
  const prevStart = addMonths(thisStart, -1);
  const prevEnd = new Date(prevStart.getFullYear(), prevStart.getMonth(), Math.min(now.getDate(), endOfMonth(prevStart).getDate()));
  return {
    from: ymd(thisStart), to: ymd(now), prevFrom: ymd(prevStart), prevTo: ymd(prevEnd),
    note: 'Bulan ini sejauh ini · arsir = tanggal yang sama bulan lalu',
  };
}

function groupBy(list, keyOf, init) {
  const map = new Map();
  list.forEach((t) => {
    const key = keyOf(t);
    const cur = map.get(key) || { key, ...init(t), total: 0, count: 0 };
    cur.total += toIdr(t);
    cur.count += 1;
    map.set(key, cur);
  });
  return map;
}

function Segmented({ options, value, onChange, small }) {
  return (
    <div className={`tabs ${small ? 'tabs-sm' : ''}`} role="tablist">
      {options.map((o) => (
        <button key={o.id} type="button" role="tab" aria-selected={value === o.id}
          className={`tab ${value === o.id ? 'active' : ''}`} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const { fetchTransactionHistory } = useFinanceStore();
  const [tab, setTab] = useState('spending');
  const [period, setPeriod] = useState('this');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [habitInsight, setHabitInsight] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const now = useMemo(() => new Date(), []);
  const thisStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [now]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    fetchTransactionHistory(user.id, ymd(addMonths(thisStart, -11)))
      .then((data) => { if (!cancelled) { setHistory(data); setLoadError(''); } })
      .catch((err) => { if (!cancelled) setLoadError(err.message || 'Gagal memuat data'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, fetchTransactionHistory, thisStart]);

  // Transfer antar akun sendiri bukan pemasukan/pengeluaran, jadi tidak dihitung
  const real = useMemo(() => history.filter((t) => !t.transfer_type), [history]);
  const expenses = useMemo(() => real.filter((t) => t.type === 'expense'), [real]);
  const range = useMemo(() => periodRange(period, now), [period, now]);

  // ── Per kategori (dengan pembanding) ────────────────────────────
  const categories = useMemo(() => {
    const cur = groupBy(expenses.filter((t) => inRange(t, range.from, range.to)), (t) => t.category_id || 'none',
      (t) => ({ name: t.categories?.name || 'Lainnya', icon: t.categories?.icon || 'other_expense' }));
    const prev = groupBy(expenses.filter((t) => inRange(t, range.prevFrom, range.prevTo)), (t) => t.category_id || 'none', () => ({}));
    const all = [...cur.values()]
      .map((c) => ({ ...c, prev: prev.get(c.key)?.total || 0, need: NEEDS.has(c.icon) }))
      .sort((a, b) => b.total - a.total);
    const rows = all.slice(0, 9);
    const max = Math.max(1, ...rows.map((r) => Math.max(r.total, r.prev)));
    const needs = all.filter((c) => c.need).reduce((s, c) => s + c.total, 0);
    const wants = all.filter((c) => !c.need).reduce((s, c) => s + c.total, 0);
    return { all, rows, max, needs, wants };
  }, [expenses, range]);

  const needPct = categories.needs + categories.wants > 0
    ? Math.round((categories.needs / (categories.needs + categories.wants)) * 100)
    : 0;

  // ── Per akun ────────────────────────────────────────────────────
  const byAccount = useMemo(() => {
    const rows = [...groupBy(expenses.filter((t) => inRange(t, range.from, range.to)), (t) => t.account_id,
      (t) => ({ name: t.accounts?.name || 'Akun' })).values()].sort((a, b) => b.total - a.total);
    return { rows, max: Math.max(1, ...rows.map((r) => r.total)) };
  }, [expenses, range]);

  // ── Heatmap 12 minggu ───────────────────────────────────────────
  const heat = useMemo(() => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const start = new Date(monday);
    start.setDate(monday.getDate() - 7 * 11);

    const totals = new Map();
    expenses.forEach((t) => totals.set(t.date, (totals.get(t.date) || 0) + toIdr(t)));

    const weeks = Array.from({ length: 12 }, (_, w) => {
      const weekStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7);
      const days = Array.from({ length: 7 }, (_, d) => {
        const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + d);
        const key = ymd(date);
        return { key, date, amount: totals.get(key) || 0, future: date > today };
      });
      return { start: weekStart, days };
    });

    const days = weeks.flatMap((w) => w.days).filter((d) => !d.future);
    const amounts = days.map((d) => d.amount).filter((a) => a > 0).sort((a, b) => a - b);
    const q = (p) => (amounts.length ? amounts[Math.min(amounts.length - 1, Math.floor(p * amounts.length))] : 0);
    const [t1, t2, t3] = [q(0.25), q(0.5), q(0.75)];
    const level = (a) => (a <= 0 ? 0 : a <= t1 ? 1 : a <= t2 ? 2 : a <= t3 ? 3 : 4);
    const top = new Set([...days].filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 5).map((d) => d.key));
    return { weeks, level, top, total: amounts.reduce((s, a) => s + a, 0) };
  }, [expenses, now]);

  // ── Arus kas bulanan ────────────────────────────────────────────
  const months = useMemo(() => monthlyFlow(history, now, 12), [history, now]);

  // Rata-rata per bulan dari 6 bulan penuh terakhir (bulan berjalan belum selesai)
  const averages = useMemo(() => {
    const done = months.slice(-7, -1).filter((m) => m.income > 0 || m.expense > 0);
    const n = Math.max(done.length, 1);
    const inc = done.reduce((s, m) => s + m.income, 0) / n;
    const exp = done.reduce((s, m) => s + m.expense, 0) / n;
    const from = done[0]?.key;
    const sources = new Set(real
      .filter((t) => t.type === 'income' && from && t.date >= `${from}-01` && t.date < ymd(thisStart))
      .map((t) => (t.description || t.categories?.name || '').trim().toLowerCase())
      .filter(Boolean));
    const topCat = [...groupBy(expenses.filter((t) => from && t.date >= `${from}-01` && t.date < ymd(thisStart)),
      (t) => t.category_id || 'none', (t) => ({ name: t.categories?.name || 'Lainnya' })).values()]
      .sort((a, b) => b.total - a.total)[0];
    return { months: done.length, inc, exp, kept: inc - exp, rate: inc > 0 ? Math.round(((inc - exp) / inc) * 100) : null, sources: sources.size, topCat };
  }, [months, real, expenses, thisStart]);

  // ── Merchant ────────────────────────────────────────────────────
  const merchants = useMemo(() => {
    const list = expenses.filter((t) => inRange(t, range.from, range.to) && t.description?.trim());
    const rows = [...groupBy(list, (t) => t.description.trim().toLowerCase().replace(/\s+/g, ' '),
      (t) => ({ name: t.description.trim(), category: t.categories?.name || 'Lainnya' })).values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    return { rows, max: Math.max(1, ...rows.map((r) => r.total)) };
  }, [expenses, range]);

  const currentMonth = months[months.length - 1];

  const handleExport = () => {
    const label = getMonthLabel(currentMonth.key);
    const monthCats = [...groupBy(expenses.filter((t) => t.date.startsWith(currentMonth.key)), (t) => t.category_id || 'none',
      (t) => ({ name: t.categories?.name || 'Lainnya' })).values()].sort((a, b) => b.total - a.total);
    try {
      exportReportToPDF(
        { income: currentMonth.income, expense: currentMonth.expense, net: currentMonth.income - currentMonth.expense },
        monthCats,
        label
      );
      toast.success(`Laporan ${label} diunduh`);
    } catch (err) {
      console.error(err);
      toast.error('PDF gagal dibuat. Coba lagi.');
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setHabitInsight('');
    try {
      const trend = months.slice(-6).map(({ label, income, expense }) => ({ label, income, expense }));
      const monthCats = categories.all.map(({ name, total }) => ({ name, total }));
      setHabitInsight(await analyzeHabits(trend, monthCats, getMonthLabel(currentMonth.key)));
    } catch (err) {
      setHabitInsight(`Gagal memuat analisis. ${err.message || ''}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const fmt = (n) => formatCurrency(Math.round(n));

  return (
    <div className="reports-page insight-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Laporan</h1>
          <p className="text-secondary text-sm">Ke mana uang Anda masuk, tersimpan, dan keluar.</p>
        </div>
        <button className="btn btn-outline" onClick={handleExport} disabled={loading}>
          <Download size={16} /> Unduh PDF
        </button>
      </div>

      <div className="line-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
            className={`line-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="insight-grid" aria-busy="true">
          <div className="card insight-card insight-skeleton" style={{ height: 360 }} />
          <div className="insight-side">
            <div className="card insight-card insight-skeleton" style={{ height: 170 }} />
            <div className="card insight-card insight-skeleton" style={{ height: 170 }} />
          </div>
        </div>
      ) : loadError ? (
        <div className="card insight-card insight-empty">Gagal memuat data: {loadError}</div>
      ) : (
        <div className="insight-body" key={tab}>
          {tab === 'spending' && (
            <>
              <div className="insight-grid">
                {/* Per kategori */}
                <section className="card insight-card">
                  <div className="insight-card-head">
                    <div>
                      <h3 className="card-heading">Per kategori</h3>
                      <p className="card-sub">{range.note}</p>
                    </div>
                    <Segmented options={PERIODS} value={period} onChange={setPeriod} small />
                  </div>
                  {categories.rows.length === 0 ? (
                    <p className="insight-empty">Belum ada pengeluaran pada periode ini.</p>
                  ) : (
                    <div className="cat-rows">
                      {categories.rows.map((c, i) => (
                        <div className="cat-row" key={c.key} style={{ '--i': i }}
                          title={`${c.name}: ${fmt(c.total)} (sebelumnya ${fmt(c.prev)})`}>
                          <span className="cat-row-name">{c.name}</span>
                          <span className="cat-track">
                            {c.prev > 0 && <span className="cat-bar-prev" style={{ width: `${(c.prev / categories.max) * 100}%` }} />}
                            <span className={`cat-bar ${c.need ? '' : 'want'}`} style={{ width: `${(c.total / categories.max) * 100}%` }} />
                          </span>
                          <span className="cat-row-amount amount-text">{fmt(c.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="insight-legend">
                    <span><i className="dot" /> Kebutuhan</span>
                    <span><i className="dot want" /> Keinginan</span>
                    <span><i className="dot prev" /> Periode pembanding</span>
                  </div>
                </section>

                <div className="insight-side">
                  {/* Kebutuhan vs keinginan */}
                  <section className="card insight-card">
                    <h3 className="card-heading">Kebutuhan & keinginan</h3>
                    <p className="card-sub">{PERIODS.find((p) => p.id === period)?.label}</p>
                    <div className="nw">
                      <div className="nw-donut">
                        <svg viewBox="0 0 120 120" aria-hidden="true">
                          <circle cx="60" cy="60" r="48" className="nw-track" />
                          <circle cx="60" cy="60" r="48" className="nw-arc" transform="rotate(-90 60 60)"
                            style={{ strokeDasharray: `${(needPct / 100) * 301.6} 301.6` }} />
                        </svg>
                        <div className="nw-center">
                          <strong>{needPct}%</strong>
                          <span>kebutuhan</span>
                        </div>
                      </div>
                      <div className="nw-legend">
                        <div className="nw-row"><span><i className="dot" /> Kebutuhan</span><strong className="amount-text">{fmt(categories.needs)}</strong></div>
                        <div className="nw-row"><span><i className="dot want" /> Keinginan</span><strong className="amount-text">{fmt(categories.wants)}</strong></div>
                        <p className="nw-note">Kebutuhan: perumahan, tagihan, makan, transportasi, kesehatan, pendidikan.</p>
                      </div>
                    </div>
                  </section>

                  {/* Per akun */}
                  <section className="card insight-card">
                    <h3 className="card-heading">Dari akun mana</h3>
                    <p className="card-sub">Pengeluaran per akun, {PERIODS.find((p) => p.id === period)?.label.toLowerCase()}</p>
                    {byAccount.rows.length === 0 ? (
                      <p className="insight-empty">Belum ada pengeluaran.</p>
                    ) : (
                      <div className="acc-rows">
                        {byAccount.rows.map((a, i) => (
                          <div className="acc-row" key={a.key} style={{ '--i': i }}>
                            <span className="acc-row-name">{a.name}</span>
                            <span className="cat-track thin">
                              <span className="cat-bar" style={{ width: `${(a.total / byAccount.max) * 100}%` }} />
                            </span>
                            <span className="cat-row-amount amount-text">{fmt(a.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>

              {/* Heatmap */}
              <section className="card insight-card">
                <div className="insight-card-head">
                  <div>
                    <h3 className="card-heading">Pengeluaran harian</h3>
                    <p className="card-sub">12 minggu terakhir · 5 hari dengan pengeluaran terbesar diberi garis tepi</p>
                  </div>
                  <span className="heat-total amount-text">{fmt(heat.total)}</span>
                </div>
                <div className="heatmap">
                  <span />
                  {heat.weeks.map((w, i) => (
                    <span key={w.start.toISOString()} className="heat-col-label">{i % 2 === 0 ? shortDay(w.start) : ''}</span>
                  ))}
                  {WEEKDAYS.map((label, d) => (
                    <Fragment key={label}>
                      <span className="heat-row-label">{d % 2 === 0 ? label : ''}</span>
                      {heat.weeks.map((w, wi) => {
                        const day = w.days[d];
                        const cls = day.future ? 'is-future' : `l${heat.level(day.amount)} ${heat.top.has(day.key) ? 'is-top' : ''}`;
                        return (
                          <span key={day.key} className={`heat-cell ${cls}`} style={{ '--i': wi }}
                            title={day.future ? '' : `${shortDay(day.date)}: ${fmt(day.amount)}`} />
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
                <div className="heat-legend">
                  <span>Sedikit</span>
                  {[0, 1, 2, 3, 4].map((l) => <i key={l} className={`heat-cell l${l}`} />)}
                  <span>Banyak</span>
                </div>
              </section>
            </>
          )}

          {tab === 'flow' && (
            <>
              <div className="flow-stats">
                <section className="card flow-stat" style={{ '--i': 0 }}>
                  <span className="flow-stat-label"><ArrowDownLeft size={15} /> Rata-rata masuk sebulan</span>
                  <strong className="flow-stat-value amount-text">{fmt(averages.inc)}</strong>
                  <span className="flow-stat-note">
                    {averages.months === 0 ? 'Belum ada bulan yang lengkap' : `${averages.months} bulan terakhir · ${averages.sources} sumber pemasukan`}
                  </span>
                </section>
                <section className="card flow-stat" style={{ '--i': 1 }}>
                  <span className="flow-stat-label"><ArrowUpRight size={15} /> Rata-rata keluar sebulan</span>
                  <strong className="flow-stat-value amount-text">{fmt(averages.exp)}</strong>
                  <span className="flow-stat-note">
                    {averages.topCat ? `Terbesar: ${averages.topCat.name}` : 'Belum ada pengeluaran'}
                  </span>
                </section>
                <section className="card flow-stat" style={{ '--i': 2 }}>
                  <span className="flow-stat-label"><PiggyBank size={15} /> Rata-rata disimpan</span>
                  <strong className={`flow-stat-value amount-text ${averages.kept < 0 ? 'is-negative' : ''}`}>{fmt(averages.kept)}</strong>
                  <span className="flow-stat-note">
                    {averages.rate === null ? 'Belum ada pemasukan' : `${averages.rate}% dari pemasukan (target 20%)`}
                  </span>
                </section>
              </div>

              <MoneyFlowCard months={months} defaultRange={12} />

              <section className="card insight-card">
                <div className="insight-card-head">
                  <div>
                    <h3 className="card-heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} /> Analisis kebiasaan (AI)
                    </h3>
                    <p className="card-sub">Membandingkan {getMonthLabel(currentMonth.key)} dengan 5 bulan sebelumnya</p>
                  </div>
                  {!analyzing && (
                    <button className="btn btn-primary btn-sm" onClick={handleAnalyze}>
                      {habitInsight ? 'Analisis ulang' : 'Analisis sekarang'}
                    </button>
                  )}
                </div>
                {analyzing ? (
                  <div className="insight-loading"><span className="spinner" /> Membaca pola belanja Anda…</div>
                ) : habitInsight ? (
                  <div className="insight-markdown"><ReactMarkdown>{habitInsight}</ReactMarkdown></div>
                ) : (
                  <p className="card-sub">Tekan tombol untuk mendapat ringkasan kebiasaan belanja dari AI.</p>
                )}
              </section>
            </>
          )}

          {tab === 'merchants' && (
            <section className="card insight-card">
              <div className="insight-card-head">
                <div>
                  <h3 className="card-heading">Tempat belanja teratas</h3>
                  <p className="card-sub">Dikelompokkan dari keterangan transaksi</p>
                </div>
                <Segmented options={PERIODS} value={period} onChange={setPeriod} small />
              </div>
              {merchants.rows.length === 0 ? (
                <p className="insight-empty">Belum ada pengeluaran dengan keterangan pada periode ini.</p>
              ) : (
                <div className="merchant-rows">
                  {merchants.rows.map((m, i) => (
                    <div className="merchant-row" key={m.key} style={{ '--i': i }}>
                      <span className="merchant-rank">{i + 1}</span>
                      <span className="merchant-info">
                        <span className="merchant-name">{m.name}</span>
                        <span className="merchant-meta">{m.category} · {m.count}× transaksi</span>
                      </span>
                      <span className="cat-track thin merchant-track">
                        <span className="cat-bar" style={{ width: `${(m.total / merchants.max) * 100}%` }} />
                      </span>
                      <span className="cat-row-amount amount-text">{fmt(m.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="card-sub" style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Receipt size={14} /> Tulis keterangan yang konsisten (mis. “Indomaret”) agar pengelompokannya akurat.
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
