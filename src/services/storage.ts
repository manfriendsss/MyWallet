import type { Category, Transaction, Wallet } from '../types';
import { convertToVnd, getStoredExchangeRates } from './currency';

const KEYS = {
  WALLETS: 'mywallet_data_wallets',
  CATEGORIES: 'mywallet_data_categories',
  TRANSACTIONS: 'mywallet_data_transactions',
  HAS_SEEDED: 'mywallet_has_seeded_v1',
};

export const INITIAL_WALLETS: Wallet[] = [
  {
    id: 'w-cash',
    name: 'Ví tiền mặt',
    currency: 'VND',
    initialBalance: 2500000,
    currentBalance: 2500000,
    color: '#10b981',
    icon: 'Wallet',
    isDefault: true,
  },
  {
    id: 'w-bank',
    name: 'MB Bank',
    currency: 'VND',
    initialBalance: 28650000,
    currentBalance: 28650000,
    color: '#3b82f6',
    icon: 'Landmark',
  },
  {
    id: 'w-paypal',
    name: 'PayPal USD',
    currency: 'USD',
    initialBalance: 450,
    currentBalance: 450,
    color: '#0284c7',
    icon: 'CreditCard',
  },
  {
    id: 'w-poland',
    name: 'Santander Ba Lan',
    currency: 'PLN',
    initialBalance: 860,
    currentBalance: 860,
    color: '#dc2626',
    icon: 'Globe',
  },
];

export const INITIAL_CATEGORIES: Category[] = [
  // Expense (Chi tiêu)
  { id: 'c-food', name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#f97316' },
  { id: 'c-shopping', name: 'Mua sắm', type: 'expense', icon: 'ShoppingBag', color: '#ec4899' },
  { id: 'c-transport', name: 'Di chuyển', type: 'expense', icon: 'Car', color: '#3b82f6' },
  { id: 'c-house', name: 'Nhà cửa & Hóa đơn', type: 'expense', icon: 'Home', color: '#8b5cf6' },
  { id: 'c-entertainment', name: 'Giải trí', type: 'expense', icon: 'Film', color: '#14b8a6' },
  { id: 'c-health', name: 'Sức khỏe', type: 'expense', icon: 'HeartPulse', color: '#ef4444' },
  { id: 'c-work', name: 'Công việc & Học tập', type: 'expense', icon: 'GraduationCap', color: '#06b6d4' },
  { id: 'c-other-exp', name: 'Chi khác', type: 'expense', icon: 'CircleEllipsis', color: '#64748b' },

  // Income (Thu nhập)
  { id: 'c-salary', name: 'Lương cố định', type: 'income', icon: 'Briefcase', color: '#10b981' },
  { id: 'c-bonus', name: 'Thưởng & Dự án', type: 'income', icon: 'Award', color: '#f59e0b' },
  { id: 'c-invest', name: 'Đầu tư & Lãi', type: 'income', icon: 'TrendingUp', color: '#6366f1' },
  { id: 'c-gift', name: 'Quà tặng & Khác', type: 'income', icon: 'Gift', color: '#ec4899' },
];

function generateSeedTransactions(): Transaction[] {
  const rates = getStoredExchangeRates();
  const now = new Date();
  const formatDate = (offsetDays: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().split('T')[0];
  };

  const seed: Array<Omit<Transaction, 'amountVnd' | 'exchangeRate'>> = [
    {
      id: 'tx-1',
      type: 'income',
      amount: 32000000,
      currency: 'VND',
      walletId: 'w-bank',
      categoryId: 'c-salary',
      date: formatDate(1),
      time: '09:30',
      note: 'Lương tháng nhận qua tài khoản MB',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx-2',
      type: 'expense',
      amount: 75000,
      currency: 'VND',
      walletId: 'w-cash',
      categoryId: 'c-food',
      date: formatDate(0),
      time: '08:15',
      note: 'Cà phê sáng & Bánh mì',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx-3',
      type: 'income',
      amount: 180,
      currency: 'USD',
      walletId: 'w-paypal',
      categoryId: 'c-bonus',
      date: formatDate(2),
      time: '15:20',
      note: 'Tiền freelance quốc tế gửi về PayPal',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx-4',
      type: 'expense',
      amount: 125,
      currency: 'PLN',
      walletId: 'w-poland',
      categoryId: 'c-shopping',
      date: formatDate(3),
      time: '19:40',
      note: 'Mua sắm siêu thị Biedronka Warsaw',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx-5',
      type: 'expense',
      amount: 250000,
      currency: 'VND',
      walletId: 'w-cash',
      categoryId: 'c-food',
      date: formatDate(4),
      time: '12:00',
      note: 'Ăn trưa liên hoan nhóm',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx-6',
      type: 'expense',
      amount: 45,
      currency: 'USD',
      walletId: 'w-paypal',
      categoryId: 'c-work',
      date: formatDate(5),
      time: '10:00',
      note: 'Gói GitHub Copilot & Cloudflare Tools',
      createdAt: new Date().toISOString(),
    },
  ];

  return seed.map((tx) => {
    const { amountVnd, rateUsed } = convertToVnd(tx.amount, tx.currency, rates);
    return {
      ...tx,
      amountVnd,
      exchangeRate: rateUsed,
    };
  });
}

export function loadWallets(): Wallet[] {
  try {
    const raw = localStorage.getItem(KEYS.WALLETS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading wallets:', e);
  }
  return INITIAL_WALLETS;
}

export function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(KEYS.CATEGORIES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading categories:', e);
  }
  return INITIAL_CATEGORIES;
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(KEYS.TRANSACTIONS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading transactions:', e);
  }
  return [];
}

export function initializeStorageIfNeeded(): {
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
} {
  const hasSeeded = localStorage.getItem(KEYS.HAS_SEEDED);
  if (!hasSeeded) {
    const wallets = INITIAL_WALLETS;
    const categories = INITIAL_CATEGORIES;
    const transactions = generateSeedTransactions();

    saveWallets(wallets);
    saveCategories(categories);
    saveTransactions(transactions);
    localStorage.setItem(KEYS.HAS_SEEDED, 'true');

    return recalculateWalletBalances(wallets, transactions);
  }

  const wallets = loadWallets();
  const categories = loadCategories();
  const transactions = loadTransactions();

  return recalculateWalletBalances(wallets, transactions, categories);
}

export function saveWallets(wallets: Wallet[]): void {
  try {
    localStorage.setItem(KEYS.WALLETS, JSON.stringify(wallets));
  } catch (e) {
    console.error('Failed to save wallets:', e);
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories:', e);
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  try {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error('Failed to save transactions:', e);
  }
}

/**
 * Accurately calculate wallet currentBalance based on initialBalance + sum of transactions
 */
export function recalculateWalletBalances(
  wallets: Wallet[],
  transactions: Transaction[],
  categories?: Category[]
): { wallets: Wallet[]; categories: Category[]; transactions: Transaction[] } {
  const updatedWallets = wallets.map((w) => {
    let balance = Number(w.initialBalance) || 0;
    const walletTxs = transactions.filter((tx) => tx.walletId === w.id);
    for (const tx of walletTxs) {
      if (tx.type === 'income') {
        balance += Number(tx.amount) || 0;
      } else {
        balance -= Number(tx.amount) || 0;
      }
    }
    return {
      ...w,
      currentBalance: balance,
    };
  });

  return {
    wallets: updatedWallets,
    categories: categories || loadCategories(),
    transactions,
  };
}
