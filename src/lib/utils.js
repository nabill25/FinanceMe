// Currency formatter
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyShort = (amount) => {
  return formatCurrency(amount); // Use full formatting everywhere per user request
};

export const formatCurrencyChart = (amount) => {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    // If it's a clean million, don't show .0
    const millions = amount / 1_000_000;
    return `Rp ${millions % 1 === 0 ? millions : millions.toFixed(1)}jt`;
  }
  if (Math.abs(amount) >= 1_000) {
    const thousands = amount / 1_000;
    return `Rp ${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}rb`;
  }
  return formatCurrency(amount);
};

// Date formatters
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
};

export const formatDateShort = (date) => {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(date));
};

export const formatDateInput = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getMonthLabel = (monthStr) => {
  const [year, month] = monthStr.split('-');
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1));
};

// Generate unique id
export const generateId = () => crypto.randomUUID();

// Clamp number
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Account type labels
export const ACCOUNT_TYPES = {
  cash: { label: 'Tunai', icon: '💵' },
  bank: { label: 'Rekening Bank', icon: '🏦' },
  ewallet: { label: 'Dompet Digital', icon: '📱' },
  investment: { label: 'Investasi', icon: '📈' },
};

// Account Providers (Bank & E-Wallet)
export const ACCOUNT_PROVIDERS = {
  bank: [
    { id: 'bca',         name: 'BCA',           color: '#0066AE', slug: 'bca' },
    { id: 'mandiri',     name: 'Mandiri',        color: '#003D79', slug: 'mandiri' },
    { id: 'bni',         name: 'BNI',            color: '#F15A23', slug: 'bni' },
    { id: 'bri',         name: 'BRI',            color: '#00529C', slug: 'bri' },
    { id: 'bsi',         name: 'BSI',            color: '#3E8914', slug: 'bsi' },
    { id: 'btn',         name: 'BTN',            color: '#F7941D', slug: 'btn' },
    { id: 'jago',        name: 'Bank Jago',      color: '#F8B124', slug: 'jago' },
    { id: 'seabank',     name: 'SeaBank',        color: '#EE4D2D', slug: 'seabank' },
    { id: 'jenius',      name: 'Jenius (BTPN)',  color: '#00B4D8', slug: 'jenius' },
    { id: 'cimb-niaga',  name: 'CIMB Niaga',    color: '#C0392B', slug: 'cimb-niaga' },
    { id: 'danamon',     name: 'Danamon',        color: '#EF3E33', slug: 'danamon' },
    { id: 'permata',     name: 'PermataBa',      color: '#00529C', slug: 'permata' },
    { id: 'ocbc-nisp',   name: 'OCBC NISP',     color: '#EE3524', slug: 'ocbc-nisp' },
    { id: 'maybank',     name: 'Maybank',        color: '#F7A800', slug: 'maybank' },
    { id: 'panin-bank',  name: 'Panin Bank',     color: '#004A97', slug: 'panin-bank' },
    { id: 'other_bank',  name: 'Bank Lainnya',   color: '#3b82f6', slug: null },
  ],
  ewallet: [
    { id: 'gopay',          name: 'GoPay',           color: '#00AED6', slug: 'gopay' },
    { id: 'ovo',            name: 'OVO',             color: '#4C2A86', slug: 'ovo' },
    { id: 'shopeepay',      name: 'ShopeePay',       color: '#EE4D2D', slug: 'shopeepay' },
    { id: 'dana',           name: 'DANA',            color: '#118EEA', slug: 'dana' },
    { id: 'linkaja',        name: 'LinkAja',         color: '#E3000F', slug: 'linkaja' },
    { id: 'other_ewallet',  name: 'E-Wallet Lainnya',color: '#10b981', slug: null },
  ]
};

// Default category icons
export const CATEGORY_ICONS = {
  salary: '💼',
  food: '🍔',
  transport: '🚗',
  shopping: '🛍️',
  bills: '📋',
  entertainment: '🎬',
  health: '💊',
  education: '📚',
  housing: '🏠',
  investment: '📈',
  other_income: '💰',
  other_expense: '💸',
};

export const DEFAULT_CATEGORIES = [
  { name: 'Gaji', type: 'income', icon: 'salary', color: '#10b981' },
  { name: 'Freelance', type: 'income', icon: 'other_income', color: '#06b6d4' },
  { name: 'Investasi', type: 'income', icon: 'investment', color: '#8b5cf6' },
  { name: 'Lainnya', type: 'income', icon: 'other_income', color: '#f59e0b' },
  { name: 'Makanan & Minuman', type: 'expense', icon: 'food', color: '#f97316' },
  { name: 'Transportasi', type: 'expense', icon: 'transport', color: '#3b82f6' },
  { name: 'Belanja', type: 'expense', icon: 'shopping', color: '#ec4899' },
  { name: 'Tagihan & Utilitas', type: 'expense', icon: 'bills', color: '#ef4444' },
  { name: 'Hiburan', type: 'expense', icon: 'entertainment', color: '#a855f7' },
  { name: 'Kesehatan', type: 'expense', icon: 'health', color: '#14b8a6' },
  { name: 'Pendidikan', type: 'expense', icon: 'education', color: '#f59e0b' },
  { name: 'Perumahan', type: 'expense', icon: 'housing', color: '#64748b' },
  { name: 'Lainnya', type: 'expense', icon: 'other_expense', color: '#6b7280' },
];
