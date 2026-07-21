import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight,
  PieChart, BarChart3, HelpCircle, LogOut, Wallet,
  Menu, X, PiggyBank, Settings, Zap, Repeat, CalendarDays,
  Sun, Moon, Bot, TrendingUp, Scissors
} from 'lucide-react';
import { useState } from 'react';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '../../store/authStore';
import { useFinanceStore } from '../../store/financeStore';
import { useLanguageStore } from '../../store/languageStore';
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

const mobileMainItems = navItems.slice(0, 4);
const mobileMoreItems = navItems.slice(4);

export default function Sidebar() {
  const { user, signOut } = useAuthStore();
  const { theme, toggleTheme } = useFinanceStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <>
      {/* --- SIDEBAR --- */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : 'desktop-only'}`}>
        <div className="sidebar-header mobile-only" style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '0' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => setMobileOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        {/* Logo */}
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-logo-icon" style={{ padding: 0, background: 'transparent' }}>
              <img src="/logo.png" alt="FinanceMe Logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
            </div>
            <span className="sidebar-logo-text">FinanceMe</span>
          </div>
          <div className="desktop-only">
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
            onClick={toggleTheme}
            title={theme === 'dark' ? "Mode Terang" : "Mode Gelap"}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
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
        <button className="hamburger-btn" onClick={() => setMobileOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="sidebar-logo" style={{ padding: 0 }}>
          <span className="sidebar-logo-text">FinanceMe</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-icon btn-ghost" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
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
