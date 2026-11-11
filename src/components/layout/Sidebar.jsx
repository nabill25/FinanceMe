import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Wallet, X, Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import NotificationBell from './NotificationBell';
import { NAV_GROUPS } from './navItems';
import { useAuthStore } from '../../store/authStore';
import { useFinanceStore } from '../../store/financeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useUiStore } from '../../store/uiStore';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/scrollLock';
import { useShellData, useThemeToggle, useUserIdentity } from '../../lib/useShellData';
import { formatCurrency } from '../../lib/utils';
import './Sidebar.css';

/** Kartu ringkas di bawah sidebar: berapa yang aman dibelanjakan hari ini. */
function SafeToSpend({ data }) {
  if (!data.hasAccounts) return null;
  return (
    <div className="safe-card">
      <p className="safe-card-label">Aman dibelanjakan hari ini</p>
      <p className={`safe-card-amount amount-text ${data.isShort ? 'is-short' : ''}`}>
        {formatCurrency(Math.round(data.safeToday))}
      </p>
      <p className="safe-card-note">
        {data.billsDue > 0
          ? `${formatCurrency(data.billsDue)} tagihan belum dibayar · sisa ${data.daysLeft} hari`
          : `Tidak ada tagihan tersisa · sisa ${data.daysLeft} hari`}
      </p>
    </div>
  );
}

export default function Sidebar() {
  const { signOut } = useAuthStore();
  const { showBalance, setShowBalance } = useFinanceStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const { drawerOpen: mobileOpen, setDrawerOpen: setMobileOpen } = useUiStore();
  const { isDark, toggleTheme } = useThemeToggle();
  const { user, fullName, firstName, initials } = useUserIdentity();
  const shell = useShellData();
  const asideRef = useRef(null);
  const swipe = useRef(null);

  // Drawer terbuka: kunci scroll halaman di belakangnya, Esc untuk menutup
  useEffect(() => {
    if (!mobileOpen) return;
    lockBodyScroll();
    const onKeyDown = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, setMobileOpen]);

  // Geser drawer ke kiri untuk menutup (drawer mengikuti jari)
  const onTouchStart = (e) => {
    if (!mobileOpen) return;
    const p = e.touches[0];
    swipe.current = { x: p.clientX, y: p.clientY, dx: 0, horizontal: null };
  };
  const onTouchMove = (e) => {
    const s = swipe.current;
    if (!s) return;
    const p = e.touches[0];
    const dx = p.clientX - s.x;
    const dy = p.clientY - s.y;
    if (s.horizontal === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      s.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (!s.horizontal) return;
    s.dx = Math.min(0, dx);
    asideRef.current.style.transition = 'none';
    asideRef.current.style.transform = `translateX(${s.dx}px)`;
  };
  const onTouchEnd = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.horizontal) return;
    asideRef.current.style.transition = '';
    asideRef.current.style.transform = '';
    if (s.dx < -70) setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  let itemIndex = 0; // urutan global untuk animasi menu di drawer

  return (
    <>
      {/* --- SIDEBAR (desktop) / DRAWER (HP) --- */}
      <aside
        ref={asideRef}
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div className="sidebar-brand">
          <span className="brand-tile" aria-hidden="true">
            <Wallet size={20} strokeWidth={2.3} />
          </span>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">FinanceMe</span>
            <span className="sidebar-brand-sub">{firstName ? `Keuangan ${firstName}` : 'Keuangan pribadi'}</span>
          </div>
          <button className="btn btn-icon btn-ghost sidebar-close mobile-only" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Menu">
          {NAV_GROUPS.map((group, gi) => (
            <div className="sidebar-nav-section" key={gi}>
              {group.map(({ to, icon: Icon, labelKey, badge }) => {
                const count = badge ? shell.badges[badge] : 0;
                const i = itemIndex++;
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileOpen(false)}
                    style={{ '--i': i }}
                    className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={18} />
                    <span>{t(labelKey)}</span>
                    {count > 0 && <span className="sidebar-badge" aria-label={`${count} perlu perhatian`}>{count}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <SafeToSpend data={shell} />

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{fullName || 'Pengguna'}</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
          <button className="sidebar-signout btn btn-icon btn-ghost" onClick={handleSignOut} title="Keluar" aria-label="Keluar">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* --- MOBILE TOP APP BAR --- */}
      <div className="mobile-app-bar mobile-only">
        <div className="mobile-app-bar-brand">
          <span className="brand-tile brand-tile-sm" aria-hidden="true">
            <Wallet size={16} strokeWidth={2.4} />
          </span>
          <span className="sidebar-brand-name">FinanceMe</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => setShowBalance(!showBalance)} aria-label="Sembunyikan/tampilkan saldo">
            {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <button className="btn btn-icon btn-ghost" onClick={toggleTheme} aria-label={isDark ? 'Mode terang' : 'Mode gelap'}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <NotificationBell />
        </div>
      </div>

      {/* --- OVERLAY --- */}
      {mobileOpen && (
        <div className="sidebar-overlay mobile-only" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
