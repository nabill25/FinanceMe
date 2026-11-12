import { useId, useState } from 'react';
import { formatCurrency, formatCurrencyChart } from '../../lib/utils';
import TabIndicator from '../TabIndicator';
import './MoneyFlowCard.css';

const RANGES = [
  { id: 3, label: 'Kuartal' },
  { id: 6, label: '6 bulan' },
  { id: 12, label: 'Setahun' },
];

/** Batas atas sumbu yang "bulat" (mis. 7,3 jt → 8 jt) agar label sumbu mudah dibaca. */
function niceMax(value) {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value));
  const n = value / step;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 4 ? 4 : n <= 5 ? 5 : n <= 8 ? 8 : 10;
  return nice * step;
}

const fmt = (n) => formatCurrency(Math.round(n));

/**
 * Kartu "Uang masuk & keluar": pasangan batang kapsul per bulan (masuk = hijau,
 * keluar = abu-abu) dengan pilihan kuartal / 6 bulan / setahun.
 * `months` = data 12 bulan terakhir (urut lama → baru) dari monthlyFlow().
 */
export default function MoneyFlowCard({ months, loading = false, defaultRange = 12, className = '' }) {
  const [range, setRange] = useState(defaultRange);
  const [hover, setHover] = useState(null);
  const tabsId = useId();

  const list = months.slice(-range);
  const income = list.reduce((s, m) => s + m.income, 0);
  const expense = list.reduce((s, m) => s + m.expense, 0);
  const kept = income - expense;
  const top = niceMax(Math.max(0, ...list.map((m) => Math.max(m.income, m.expense))));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => top * f);
  const active = hover !== null ? list[hover] : null;
  const hasData = list.some((m) => m.income > 0 || m.expense > 0);

  return (
    <section className={`card flow-card ${className}`}>
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Uang masuk & keluar</h3>
          <p className="card-sub">{range === 12 ? 'Dua belas bulan terakhir' : `${range} bulan terakhir`}, tanpa transfer antar akun</p>
        </div>
        <div className="tabs tabs-sm" role="tablist" aria-label="Rentang waktu">
          {RANGES.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={range === r.id}
              className={`tab ${range === r.id ? 'active' : ''}`} onClick={() => { setRange(r.id); setHover(null); }}>
              {range === r.id && <TabIndicator id={tabsId} />}
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flow-legend">
        <span><i className="flow-dot in" /> Masuk <strong className="amount-text">{fmt(income)}</strong></span>
        <span><i className="flow-dot out" /> Keluar <strong className="amount-text">{fmt(expense)}</strong></span>
        <span>Disimpan <strong className={`amount-text ${kept < 0 ? 'is-negative' : ''}`}>{fmt(kept)}</strong></span>
      </div>

      {loading ? (
        <div className="flow-skeleton" aria-busy="true" />
      ) : !hasData ? (
        <div className="widget-empty flow-empty">
          <p>Belum ada pemasukan atau pengeluaran dalam {range === 12 ? '12' : range} bulan terakhir.</p>
        </div>
      ) : (
        <div className="flow-plot" onMouseLeave={() => setHover(null)}>
          <div className="flow-yaxis" aria-hidden="true">
            {ticks.map((t, i) => <span key={i}>{t === 0 ? '0' : formatCurrencyChart(t)}</span>)}
          </div>
          <div className="flow-columns" style={{ '--n': list.length }} key={range}>
            {list.map((m, i) => (
              <button
                type="button"
                key={m.key}
                className={`flow-column ${hover === i ? 'is-hover' : ''} ${i === list.length - 1 ? 'is-current' : ''}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${m.label}: masuk ${fmt(m.income)}, keluar ${fmt(m.expense)}`}
              >
                <span className="flow-pair">
                  <span className="flow-capsule">
                    <span className="flow-fill in" style={{ height: `${(m.income / top) * 100}%`, '--i': i }} />
                  </span>
                  <span className="flow-capsule">
                    <span className="flow-fill out" style={{ height: `${(m.expense / top) * 100}%`, '--i': i }} />
                  </span>
                </span>
                <span className="flow-month">{m.label}</span>
              </button>
            ))}

            {active && (
              <div className="flow-tip" style={{ '--x': `${((hover + 0.5) / list.length) * 100}%` }} role="status">
                <span className="flow-tip-month">{active.label}</span>
                <span><i className="flow-dot in" /> <strong className="amount-text">{fmt(active.income)}</strong></span>
                <span><i className="flow-dot out" /> <strong className="amount-text">{fmt(active.expense)}</strong></span>
                <span className="flow-tip-kept amount-text">Sisa {fmt(active.income - active.expense)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
