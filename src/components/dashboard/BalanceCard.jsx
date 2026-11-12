import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CountUp from 'react-countup';
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';
import { useFinanceStore } from '../../store/financeStore';
import { formatCurrency } from '../../lib/utils';
import './BalanceCard.css';

const CHART_H = 150;
const PAD_TOP = 26; // ruang untuk label "Hari ini"
const PAD_BOTTOM = 10;
const dayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
const endLabel = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
const fmt = (n) => formatCurrency(Math.round(n));

/** Lebar elemen (px), diperbarui saat ukurannya berubah. */
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function BalanceChart({ series }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const { points, todayIndex, events } = series;

  const geo = useMemo(() => {
    if (!width || points.length < 2) return null;
    const values = points.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (max - min < 1) { min -= 1; max += 1; }
    const span = max - min;
    min -= span * 0.12;
    max += span * 0.08;
    const step = width / (points.length - 1);
    const x = (i) => i * step;
    const y = (v) => PAD_TOP + (1 - (v - min) / (max - min)) * (CHART_H - PAD_TOP - PAD_BOTTOM);
    const line = (from, to) => points.slice(from, to + 1).map((p, k) => `${k ? 'L' : 'M'}${x(from + k).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    const past = line(0, todayIndex);
    const area = `${past} L${x(todayIndex).toFixed(1)},${CHART_H} L0,${CHART_H} Z`;
    const future = todayIndex < points.length - 1 ? line(todayIndex, points.length - 1) : '';
    const dots = events.map((e) => {
      const i = points.findIndex((p) => p.key === e.key);
      return i < 0 ? null : { ...e, cx: x(i), cy: y(points[i].value) };
    }).filter(Boolean);
    return { x, y, step, past, area, future, dots };
  }, [width, points, todayIndex, events]);

  const onMove = (e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - rect.left) / geo.step);
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const hp = hover !== null ? points[hover] : null;
  const todayX = geo ? geo.x(todayIndex) : 0;

  return (
    <div
      className="bal-chart"
      ref={ref}
      onPointerDown={onMove}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      onPointerCancel={() => setHover(null)}
    >
      {geo && (
        <svg width={width} height={CHART_H} role="img" aria-label="Grafik saldo harian dan perkiraan sampai akhir bulan">
          <defs>
            <linearGradient id="bal-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: 'var(--accent-primary)', stopOpacity: 0.26 }} />
              <stop offset="100%" style={{ stopColor: 'var(--accent-primary)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <line className="bal-today-line" x1={todayX} x2={todayX} y1={PAD_TOP - 4} y2={CHART_H} />
          <path className="bal-area" d={geo.area} fill="url(#bal-area)" />
          <path className="bal-line" d={geo.past} pathLength="1" />
          {geo.future && <path className="bal-forecast" d={geo.future} />}
          {geo.dots.map((d) => (
            <circle key={`${d.type}-${d.key}-${d.name}`} className={`bal-event ${d.type}`} cx={d.cx} cy={d.cy} r="4.5">
              <title>{`${d.type === 'payday' ? 'Pemasukan' : 'Tagihan'} ${d.name}: ${fmt(d.amount)}`}</title>
            </circle>
          ))}
          {hp && (
            <g className="bal-hover">
              <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD_TOP - 4} y2={CHART_H} />
              <circle cx={geo.x(hover)} cy={geo.y(hp.value)} r="4" />
            </g>
          )}
        </svg>
      )}
      {geo && !hp && (
        <span className="bal-today-label" style={{ left: Math.min(Math.max(todayX, 28), width - 28) }}>Hari ini</span>
      )}
      {hp && geo && (
        <div className="bal-tip" style={{ left: Math.min(Math.max(geo.x(hover), 70), width - 70) }}>
          <span>{dayLabel.format(hp.date)}{hp.future ? ' · perkiraan' : ''}</span>
          <strong className="amount-text">{fmt(hp.value)}</strong>
        </div>
      )}
    </div>
  );
}

/**
 * Kartu "Total saldo": angka besar, perubahan dibanding bulan lalu, pil pengeluaran,
 * dan grafik saldo 5 minggu terakhir + perkiraan sampai akhir bulan.
 */
export default function BalanceCard({ totalBalance, accounts, spend, change, series, loading }) {
  const { showBalance, setShowBalance } = useFinanceStore();
  const names = accounts.map((a) => a.name);
  const sub = accounts.length === 0
    ? 'Belum ada akun'
    : `${accounts.length} akun · ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
  const hasBills = series?.events.some((e) => e.type === 'bill');
  const hasPayday = series?.events.some((e) => e.type === 'payday');

  return (
    <section className="card bal-card">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Total saldo</h3>
          <p className="card-sub">{sub}</p>
        </div>
        <button
          type="button"
          className="round-icon-btn"
          onClick={() => setShowBalance(!showBalance)}
          aria-label={showBalance ? 'Sembunyikan nominal' : 'Tampilkan nominal'}
          title={showBalance ? 'Sembunyikan nominal' : 'Tampilkan nominal'}
        >
          {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="bal-top">
        <div className="bal-figure">
          <p className="bal-amount amount-text">
            <CountUp start={0} end={totalBalance} duration={1.4} formattingFn={formatCurrency} preserveValue />
          </p>
          {change !== null && change !== undefined && (
            <p className="bal-change">
              <span className={`bal-badge ${change >= 0 ? 'up' : 'down'}`}>
                {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {change >= 0 ? '+' : '−'}{Math.abs(change).toFixed(1).replace('.', ',')}%
              </span>
              dibanding bulan lalu
            </p>
          )}
        </div>

        <div className="bal-spend">
          <span className="bal-spend-label" id="bal-spend-label">Pengeluaran</span>
          <div className="bal-pills" role="group" aria-labelledby="bal-spend-label">
            {[
              ['Hari ini', spend.today],
              ['Minggu ini', spend.week],
              ['Bulan ini', spend.month],
              ['Tahun ini', spend.year],
            ].map(([label, value]) => (
              <div className="bal-pill" key={label} title={`Pengeluaran ${label.toLowerCase()} (tanpa transfer antar akun)`}>
                <span>{label}</span>
                <strong className="amount-text">{fmt(value)}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bal-empty">
          <p>Tambahkan akun untuk melihat perkembangan saldo.</p>
          <Link to="/accounts" className="btn btn-primary btn-sm">Tambah akun</Link>
        </div>
      ) : loading || !series ? (
        <div className="bal-chart bal-chart-skeleton" aria-busy="true" />
      ) : (
        <>
          <BalanceChart series={series} />
          <div className="bal-legend">
            <span><i className="bal-key line" /> Saldo</span>
            <span><i className="bal-key dotted" /> Perkiraan</span>
            {hasPayday && <span><i className="bal-key dot payday" /> Pemasukan</span>}
            {hasBills && <span><i className="bal-key dot bill" /> Tagihan</span>}
            <span className="bal-legend-end">
              {endLabel.format(series.endDate)} <strong className="amount-text">{fmt(series.endValue)}</strong>
            </span>
          </div>
        </>
      )}
    </section>
  );
}
