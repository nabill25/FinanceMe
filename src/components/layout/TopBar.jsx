import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Eye, EyeOff, Sun, Moon, Wallet, ArrowRight } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { NAV_ITEMS } from './navItems';
import { useFinanceStore } from '../../store/financeStore';
import { useLanguageStore } from '../../store/languageStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeToggle, useUserIdentity } from '../../lib/useShellData';
import './TopBar.css';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Pencarian cepat: halaman, akun, atau kata kunci transaksi. Buka dengan ⌘K / Ctrl+K. */
function CommandSearch() {
  const navigate = useNavigate();
  const { accounts } = useFinanceStore();
  const { t } = useLanguageStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages = NAV_ITEMS
      .map((item) => ({ type: 'page', key: item.to, label: t(item.labelKey), icon: item.icon, to: item.to }))
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .slice(0, q ? 6 : 5);
    const accs = q
      ? accounts
          .filter((a) => a.name.toLowerCase().includes(q))
          .slice(0, 3)
          .map((a) => ({ type: 'account', key: `acc-${a.id}`, label: a.name, icon: Wallet, id: a.id }))
      : [];
    const search = q ? [{ type: 'search', key: 'search', label: `Cari transaksi “${query.trim()}”`, icon: Search, q: query.trim() }] : [];
    return [...pages, ...accs, ...search];
  }, [query, accounts, t]);

  const choose = (item) => {
    if (!item) return;
    if (item.type === 'page') navigate(item.to);
    if (item.type === 'account') navigate('/accounts', { state: { openAccountId: item.id } });
    if (item.type === 'search') navigate('/transactions', { state: { search: item.q } });
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); choose(results[active]); }
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  };

  return (
    <div className="cmd" role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <Search size={16} />
      <input
        ref={inputRef}
        value={query}
        placeholder="Cari transaksi, akun, halaman"
        aria-label="Cari transaksi, akun, atau halaman"
        onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      <kbd>{isMac ? '⌘K' : 'Ctrl K'}</kbd>

      {open && results.length > 0 && (
        <ul className="cmd-results" role="listbox">
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={item.key}
                role="option"
                aria-selected={i === active}
                className={`cmd-item ${i === active ? 'active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); choose(item); }}
              >
                <Icon size={16} />
                <span className="cmd-item-label">{item.label}</span>
                <span className="cmd-item-kind">
                  {item.type === 'page' ? 'Halaman' : item.type === 'account' ? 'Akun' : <ArrowRight size={14} />}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Top bar desktop: pencarian, tombol tambah, sensor saldo, tema, notifikasi, avatar. */
export default function TopBar() {
  const { showBalance, setShowBalance } = useFinanceStore();
  const { setQuickAddOpen } = useUiStore();
  const { isDark, toggleTheme } = useThemeToggle();
  const { initials, fullName } = useUserIdentity();

  return (
    <header className="topbar">
      <CommandSearch />
      <div className="topbar-actions">
        <button className="topbar-add" onClick={() => setQuickAddOpen(true)} aria-label="Catat transaksi" title="Catat transaksi">
          <Plus size={20} strokeWidth={2.4} />
        </button>
        <button className="topbar-icon" onClick={() => setShowBalance(!showBalance)} aria-label="Sembunyikan/tampilkan saldo" title="Sembunyikan/tampilkan saldo">
          {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button className="topbar-icon" onClick={toggleTheme} aria-label={isDark ? 'Mode terang' : 'Mode gelap'} title={isDark ? 'Mode terang' : 'Mode gelap'}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <NotificationBell />
        <div className="topbar-avatar" title={fullName}>{initials}</div>
      </div>
    </header>
  );
}
