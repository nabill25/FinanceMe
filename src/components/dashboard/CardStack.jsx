import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig, useMotionValue, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Nfc, RotateCw, ArrowUpRight, Smartphone, Wallet, TrendingUp, Plus } from 'lucide-react';
import ProviderLogo from '../ProviderLogo';
import { ACCOUNT_TYPES, formatCurrency } from '../../lib/utils';
import { useUserIdentity } from '../../lib/useShellData';
import './CardStack.css';

const VISIBLE = 3;      // jumlah kartu yang terlihat di tumpukan
// Kartu di belakang naik 11% tingginya dan mengecil 5% (poros di tepi bawah),
// jadi tepi atasnya mengintip ±6% tinggi kartu di atas kartu depannya.
const LIFT = 11;
const SPRING = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 };
const THROW = { duration: 0.42, ease: [0.4, 0, 0.2, 1] };
const FLIP = { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] };
const TYPE_ICONS = { ewallet: Smartphone, cash: Wallet, investment: TrendingUp };
const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());

function CardFront({ account, holder }) {
  const Icon = TYPE_ICONS[account.type];
  const currency = account.currency || 'IDR';
  return (
    <div className="deck-face deck-front">
      <div className="deck-row">
        <span className="deck-name">{account.name}</span>
        <Nfc size={18} className="deck-nfc" aria-hidden="true" />
      </div>
      <div className="deck-row deck-mid" aria-hidden="true">
        {account.type === 'bank' || !Icon ? <span className="deck-chip" /> : <Icon size={24} className="deck-type-icon" />}
      </div>
      <div className="deck-balance">
        <span className="deck-label">Saldo</span>
        <span className="deck-amount amount-text">{formatCurrency(account.balance, currency)}</span>
      </div>
      <div className="deck-row deck-foot">
        <span className="deck-meta">
          <span className="deck-label">Pemilik</span>
          <span>{holder || 'Saya'}</span>
        </span>
        <span className="deck-meta">
          <span className="deck-label">Jenis</span>
          <span>{ACCOUNT_TYPES[account.type]?.label || 'Akun'}</span>
        </span>
        <ProviderLogo account={account} size={18} className="deck-logo" />
      </div>
    </div>
  );
}

function CardBack({ account, stats }) {
  const currency = account.currency || 'IDR';
  return (
    <div className="deck-face deck-back" aria-hidden="true">
      <span className="deck-stripe" />
      <div className="deck-back-body">
        <span className="deck-back-title">{account.name} · {monthName}</span>
        <div className="deck-stat"><span>Masuk</span><strong className="amount-text">{formatCurrency(stats.income, currency)}</strong></div>
        <div className="deck-stat"><span>Keluar</span><strong className="amount-text">{formatCurrency(stats.expense, currency)}</strong></div>
        <div className="deck-stat"><span>Transaksi</span><strong>{stats.count}</strong></div>
      </div>
    </div>
  );
}

function DeckCard({ account, depth, leavingDir, flipped, canDrag, holder, stats, onThrow, onLeft, onFlip, onKey }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-12, 12]);
  const isTop = depth === 0 && !leavingDir;

  const target = leavingDir
    ? { x: leavingDir * 560, y: '0%', scale: 1, opacity: 0, filter: 'brightness(1)' }
    : {
        x: 0,
        y: `${-Math.min(depth, VISIBLE) * LIFT}%`,
        scale: 1 - depth * 0.05,
        opacity: depth < VISIBLE ? 1 : 0,
        filter: `brightness(${1 - Math.min(depth, VISIBLE) * 0.2})`,
      };

  return (
    <motion.div
      className={`deck-card ${isTop ? 'is-top' : ''}`}
      style={{ x, rotate, zIndex: leavingDir ? 60 : 40 - depth, '--card-tint': account.color || '#6ea8ff' }}
      initial={false}
      animate={target}
      transition={leavingDir ? THROW : SPRING}
      onAnimationComplete={() => { if (leavingDir) onLeft(); }}
      drag={isTop && canDrag ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={(_, info) => {
        const dir = Math.sign(info.offset.x || info.velocity.x);
        if (dir && (Math.abs(info.offset.x) > 110 || Math.abs(info.velocity.x) > 650)) onThrow(dir);
      }}
      onTap={isTop ? onFlip : undefined}
      onKeyDown={isTop ? onKey : undefined}
      role={isTop ? 'button' : undefined}
      tabIndex={isTop ? 0 : -1}
      aria-hidden={!isTop}
      aria-label={isTop ? `${account.name}, saldo ${formatCurrency(account.balance, account.currency || 'IDR')}. Tekan untuk membalik kartu.` : undefined}
    >
      <motion.div
        className="deck-flip"
        initial={false}
        animate={{ rotateY: depth === 0 && flipped ? 180 : 0 }}
        transition={FLIP}
        style={{ transformPerspective: 1200 }}
      >
        <CardFront account={account} holder={holder} />
        <CardBack account={account} stats={stats} />
      </motion.div>
    </motion.div>
  );
}

/**
 * Widget "Kartu": akun ditampilkan sebagai tumpukan kartu. Kartu teratas bisa
 * dilempar ke samping (pindah ke belakang) atau diketuk untuk melihat sisi
 * belakangnya (ringkasan bulan ini).
 */
export default function CardStack({ accounts, transactions }) {
  const { fullName } = useUserIdentity();
  const [rotation, setRotation] = useState(0);
  const [leaving, setLeaving] = useState(null); // { id, dir }
  const [flipped, setFlipped] = useState(false);

  const n = accounts.length;
  const topIndex = n ? ((rotation % n) + n) % n : 0;
  const ordered = Array.from({ length: n }, (_, i) => accounts[(topIndex + i) % n]);
  const top = ordered[0];

  const stats = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const s = map[t.account_id] || (map[t.account_id] = { income: 0, expense: 0, count: 0 });
      if (t.type === 'income') s.income += Number(t.amount || 0);
      if (t.type === 'expense') s.expense += Number(t.amount || 0);
      s.count += 1;
    });
    return map;
  }, [transactions]);

  const throwCard = (dir) => {
    if (n < 2 || leaving) return;
    setLeaving({ id: top.id, dir });
  };
  const finishThrow = () => {
    setLeaving(null);
    setFlipped(false);
    setRotation((r) => r + 1);
  };
  const prev = () => {
    if (n < 2 || leaving) return;
    setFlipped(false);
    setRotation((r) => r - 1);
  };
  const goTo = (i) => {
    if (leaving || i === topIndex) return;
    setFlipped(false);
    setRotation(i);
  };
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
    if (e.key === 'ArrowRight') { e.preventDefault(); throwCard(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  };

  return (
    <section className="card cards-widget">
      <div className="widget-head">
        <div>
          <h3 className="card-heading">Kartu</h3>
          <p className="card-sub">Geser kartu teratas ke samping, atau ketuk untuk membaliknya</p>
        </div>
        <Link to="/accounts" className="widget-link">Semua akun</Link>
      </div>

      {n === 0 ? (
        <div className="deck-area">
          <Link to="/accounts" className="deck-empty">
            <Plus size={20} />
            <span>Tambah akun pertama</span>
            <small>Rekening bank, e-wallet, atau uang tunai</small>
          </Link>
        </div>
      ) : (
        <MotionConfig reducedMotion="user">
          <div className="deck-area">
            <div className="deck" style={{ '--deck-depth': Math.min(n, VISIBLE) - 1 }}>
              <div className="deck-stage">
                {ordered.map((acc, i) => {
                  const isLeaving = leaving?.id === acc.id;
                  const depth = isLeaving ? 0 : leaving ? i - 1 : i;
                  return (
                    <DeckCard
                      key={acc.id}
                      account={acc}
                      depth={depth}
                      leavingDir={isLeaving ? leaving.dir : 0}
                      flipped={flipped}
                      canDrag={n > 1}
                      holder={fullName}
                      stats={stats[acc.id] || { income: 0, expense: 0, count: 0 }}
                      onThrow={throwCard}
                      onLeft={finishThrow}
                      onFlip={() => setFlipped((f) => !f)}
                      onKey={onKey}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="deck-controls">
            <div className="deck-pager">
              <button type="button" className="round-icon-btn" onClick={prev} disabled={n < 2} aria-label="Kartu sebelumnya">
                <ChevronLeft size={16} />
              </button>
              <div className="deck-dots">
                {accounts.slice(0, 8).map((a, i) => (
                  <button
                    type="button"
                    key={a.id}
                    className={`deck-dot ${i === topIndex ? 'active' : ''}`}
                    onClick={() => goTo(i)}
                    aria-label={`Tampilkan kartu ${a.name}`}
                    aria-current={i === topIndex}
                  />
                ))}
              </div>
              <button type="button" className="round-icon-btn" onClick={() => throwCard(-1)} disabled={n < 2} aria-label="Kartu berikutnya">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="deck-actions">
              <button type="button" className="round-icon-btn" onClick={() => setFlipped((f) => !f)} aria-label="Balik kartu" title="Balik kartu">
                <RotateCw size={15} />
              </button>
              <Link to="/accounts" state={{ openAccountId: top.id }} className="pill-btn">
                <ArrowUpRight size={14} /> Detail
              </Link>
            </div>
          </div>
        </MotionConfig>
      )}
    </section>
  );
}
