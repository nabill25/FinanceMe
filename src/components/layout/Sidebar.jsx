import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight,
  PieChart, BarChart3, HelpCircle, LogOut, Wallet,
  X, PiggyBank, Settings, Repeat, CalendarDays,
  Sun, Moon, Bot, TrendingUp, Scissors, Eye, EyeOff
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '../../store/authStore';
import { useFinanceStore } from '../../store/financeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useUiStore } from '../../store/uiStore';
import { lockBodyScroll, unlockBodyScroll } from '../../lib/scrollLock';
import './Sidebar.css';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/accounts', icon: Wallet, labelKey: 'common.account' },
  { to: '/transactions', icon: ArrowLeftRight, labelKey: 'nav.transactions' },
  { to: '/calendar', icon: CalendarDays, labelKey: 'nav.calendar' },
  { to: '/recurring-bills', icon: Repeat, labelKey: 'nav.recurring' },
  { to: '/budget', icon: PieChart, labelKey: 'nav.budget' },
  { to: '/savings', icon: PiggyBank, labelKey: 'nav.savings' },
  { to: '/goals', icon: CreditCard, labelKey: 'nav.goals' },
  { to: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
  { to: '/forecast', icon: TrendingUp, labelKey: 'nav.forecast' },
  { to: '/advisor', icon: Bot, labelKey: 'nav.advisor' },
  { to: '/decision', icon: HelpCircle, labelKey: 'nav.decision' },
  { to: '/split-bill', icon: Scissors, labelKey: 'nav.splitBill' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
];

export default function Sidebar() {
  const { user, signOut } = useAuthStore();
  const { theme, setTheme, showBalance, setShowBalance } = useFinanceStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const { drawerOpen: mobileOpen, setDrawerOpen: setMobileOpen } = useUiStore();
  const asideRef = useRef(null);
  const swipe = useRef(null);

  // Tema yang benar-benar tampil (pilihan "Sistem" mengikuti pengaturan perangkat)
  const isDark = theme === 'dark' || theme === 'dark-amoled'
    || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const ThemeIcon = isDark ? Sun : Moon;

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

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

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
        <div className="sidebar-header mobile-only" style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '0' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
            <X size={24} />
          </button>
        </div>

        {/* Logo */}
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-logo-icon" style={{ padding: 0, background: 'transparent', boxShadow: 'none' }}>
              <span className="brand-mark" style={{ '--size': '34px' }} role="img" aria-label="FinanceMe" />
            </div>
            <span className="sidebar-logo-text">FinanceMe</span>
          </div>
          <div className="desktop-only" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-icon btn-ghost" onClick={() => setShowBalance(!showBalance)} title="Sembunyikan/tampilkan saldo">
              {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            <button className="btn btn-icon btn-ghost" onClick={toggleTheme} title={isDark ? 'Mode terang' : 'Mode gelap'}>
              <ThemeIcon size={20} />
            </button>
            <NotificationBell />
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <span className="sidebar-nav-label">Menu</span>
            {navItems.map(({ to, icon: Icon, labelKey }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={18} />
                <span>{t(labelKey)}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User section */}
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">
              {user?.user_metadata?.full_name || 'Pengguna'}
            </span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
          <button
            className="sidebar-signout btn btn-icon btn-ghost"
            onClick={handleSignOut}
            title="Keluar"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* --- MOBILE TOP APP BAR --- */}
      <div className="mobile-app-bar mobile-only">
        <div className="mobile-app-bar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="sidebar-logo-text">FinanceMe</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => setShowBalance(!showBalance)} aria-label="Sembunyikan/tampilkan saldo">
            {showBalance ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <button className="btn btn-icon btn-ghost" onClick={toggleTheme} aria-label={isDark ? 'Mode terang' : 'Mode gelap'}>
            <ThemeIcon size={20} />
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
