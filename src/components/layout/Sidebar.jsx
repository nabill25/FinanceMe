import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut, Wallet, X, Sun, Moon, Eye, EyeOff, PanelLeftClose, PanelLeftOpen, Ellipsis, Settings, LayoutGrid, ChevronDown,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
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

const FOLDABLE_GROUP = 1; // kelompok alat tambahan (lihat navItems.js)
// Pil menu aktif meluncur ke menu yang baru dipilih
const PILL_SPRING = { type: 'spring', stiffness: 360, damping: 34, mass: 0.9 };
const readToolsOpen = () => {
  try { return localStorage.getItem('financeme-nav-more') === 'open'; } catch { return false; }
};

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

/** Menu kecil di samping nama pengguna: pengaturan, tema, keluar. */
function UserMenu({ open, onClose, onSignOut, isDark, toggleTheme }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!ref.current?.parentElement?.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="user-menu" role="menu" ref={ref}>
      <NavLink to="/settings" className="user-menu-item" role="menuitem" onClick={onClose}>
        <Settings size={16} /> Pengaturan
      </NavLink>
      <button type="button" className="user-menu-item" role="menuitem" onClick={(e) => { toggleTheme(e); onClose(); }}>
        {isDark ? <Sun size={16} /> : <Moon size={16} />} {isDark ? 'Mode terang' : 'Mode gelap'}
      </button>
      <button type="button" className="user-menu-item danger" role="menuitem" onClick={onSignOut}>
        <LogOut size={16} /> Keluar
      </button>
    </div>
  );
}

export default function Sidebar() {
  const { signOut } = useAuthStore();
  const { showBalance, setShowBalance } = useFinanceStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const { drawerOpen: mobileOpen, setDrawerOpen: setMobileOpen, sidebarCollapsed, toggleSidebar } = useUiStore();
  const { isDark, toggleTheme } = useThemeToggle();
  const { user, fullName, firstName, initials } = useUserIdentity();
  const shell = useShellData();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(readToolsOpen);
  const asideRef = useRef(null);
  const swipe = useRef(null);

  const toggleTools = () => {
    const next = !toolsOpen;
    setToolsOpen(next);
    try { localStorage.setItem('financeme-nav-more', next ? 'open' : 'closed'); } catch { /* mode privat */ }
  };

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
    setMenuOpen(false);
    await signOut();
    navigate('/auth');
  };

  let itemIndex = 0; // urutan global untuk animasi menu di drawer

  return (
    <>
      {/* --- SIDEBAR (desktop) / DRAWER (HP) --- */}
      <aside
        ref={asideRef}
        className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}
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
          <button
            type="button"
            className="sidebar-collapse desktop-only"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
            title={sidebarCollapsed ? 'Lebarkan sidebar' : 'Ciutkan sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <button className="btn btn-icon btn-ghost sidebar-close mobile-only" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
            <X size={20} />
          </button>
        </div>

        {/* layoutScroll: posisi pil tetap benar walau daftar menu di-scroll */}
        <motion.nav className="sidebar-nav" aria-label="Menu" layoutScroll>
          {NAV_GROUPS.map((group, gi) => {
            const foldable = gi === FOLDABLE_GROUP;
            const activeInside = group.some((item) => item.to !== '/' && pathname.startsWith(item.to));
            const folded = foldable && !toolsOpen && !activeInside;
            return (
            <div className={`sidebar-nav-section ${foldable ? 'can-fold' : ''} ${folded ? 'is-folded' : ''}`} key={gi}>
              {foldable && (
                <button
                  type="button"
                  className="sidebar-nav-item sidebar-fold desktop-only"
                  onClick={toggleTools}
                  aria-expanded={!folded}
                  title={sidebarCollapsed ? 'Lainnya' : undefined}
                >
                  <LayoutGrid size={18} />
                  <span className="sidebar-nav-label">Lainnya</span>
                  <ChevronDown size={16} className="sidebar-fold-chevron" aria-hidden="true" />
                </button>
              )}
              {group.map(({ to, icon: Icon, labelKey, badge }) => {
                const count = badge ? shell.badges[badge] : 0;
                const i = itemIndex++;
                const label = t(labelKey);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileOpen(false)}
                    style={{ '--i': i }}
                    title={sidebarCollapsed ? label : undefined}
                    className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span layoutId="sidebar-active-pill" className="sidebar-active-pill" transition={PILL_SPRING} aria-hidden="true" />
                        )}
                        <Icon size={18} />
                        <span className="sidebar-nav-label">{label}</span>
                        {count > 0 && <span className="sidebar-badge" aria-label={`${count} perlu perhatian`}>{count}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
            );
          })}
        </motion.nav>

        <SafeToSpend data={shell} />

        <div className="sidebar-user">
          <button
            type="button"
            className="sidebar-user-avatar"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu akun"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            tabIndex={sidebarCollapsed ? 0 : -1}
          >
            {initials}
            <span className="sidebar-user-status" aria-hidden="true" />
          </button>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{fullName || 'Pengguna'}</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
          <button
            type="button"
            className="sidebar-user-more"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu akun"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Ellipsis size={18} />
          </button>
          <UserMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onSignOut={handleSignOut}
            isDark={isDark}
            toggleTheme={toggleTheme}
          />
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
