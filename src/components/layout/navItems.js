import {
  LayoutDashboard, Wallet, ArrowLeftRight, CalendarDays, Repeat, PieChart, PiggyBank,
  CreditCard, BarChart3, TrendingUp, Bot, HelpCircle, Scissors, Settings,
} from 'lucide-react';

// Daftar halaman dalam tiga kelompok (dipisah garis di sidebar).
// Dipakai bersama oleh sidebar dan pencarian di top bar.
export const NAV_GROUPS = [
  [
    { to: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/accounts', icon: Wallet, labelKey: 'common.account' },
    { to: '/transactions', icon: ArrowLeftRight, labelKey: 'nav.transactions' },
    { to: '/calendar', icon: CalendarDays, labelKey: 'nav.calendar' },
    { to: '/recurring-bills', icon: Repeat, labelKey: 'nav.recurring', badge: 'bills' },
    { to: '/budget', icon: PieChart, labelKey: 'nav.budget', badge: 'budgets' },
    { to: '/savings', icon: PiggyBank, labelKey: 'nav.savings' },
    { to: '/goals', icon: CreditCard, labelKey: 'nav.goals' },
  ],
  [
    { to: '/reports', icon: BarChart3, labelKey: 'nav.reports' },
    { to: '/forecast', icon: TrendingUp, labelKey: 'nav.forecast' },
    { to: '/advisor', icon: Bot, labelKey: 'nav.advisor' },
    { to: '/decision', icon: HelpCircle, labelKey: 'nav.decision' },
    { to: '/split-bill', icon: Scissors, labelKey: 'nav.splitBill' },
  ],
  [
    { to: '/settings', icon: Settings, labelKey: 'nav.settings' },
  ],
];

export const NAV_ITEMS = NAV_GROUPS.flat();
