import type { Category, Transaction, Wallet } from '../types';

/** Storage is user-editable: only accept an array of objects, otherwise fall back */
function readArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((item) => item && typeof item === 'object')) return parsed;
    }
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
  }
  return fallback;
}

const KEYS = {
  WALLETS: 'mywallet_data_wallets',
  CATEGORIES: 'mywallet_data_categories',
  TRANSACTIONS: 'mywallet_data_transactions',
  HAS_SEEDED: 'mywallet_has_seeded_v2',
};

/** A new account starts with no wallets and no transactions: only the default categories */
export const INITIAL_WALLETS: Wallet[] = [];

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

/** Remove the wallet data cached in this browser (on logout) */
export function clearLocalWalletData(): void {
  try {
    for (const key of Object.values(KEYS)) localStorage.removeItem(key);
    localStorage.removeItem('mywallet_ai_settings');
    sessionStorage.clear();
  } catch {
    // storage unavailable: nothing to clear
  }
}

export function loadWallets(): Wallet[] {
  return readArray(KEYS.WALLETS, INITIAL_WALLETS);
}

export function loadCategories(): Category[] {
  return readArray(KEYS.CATEGORIES, INITIAL_CATEGORIES);
}

export function loadTransactions(): Transaction[] {
  return readArray<Transaction>(KEYS.TRANSACTIONS, []).filter(
    (tx) => typeof tx.date === 'string' && Number.isFinite(Number(tx.amount))
  );
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
    const transactions: Transaction[] = [];

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
  // Opening balance, then every entry: income adds, expense subtracts,
  // a transfer leaves one wallet and arrives in another (in that wallet's currency)
  const balances = new Map(wallets.map((w) => [w.id, Number(w.initialBalance) || 0]));
  const add = (id: string | undefined, delta: number) => {
    if (id && balances.has(id)) balances.set(id, (balances.get(id) ?? 0) + delta);
  };
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    if (tx.type === 'income') add(tx.walletId, amount);
    else if (tx.type === 'expense') add(tx.walletId, -amount);
    else if (tx.type === 'transfer') {
      add(tx.walletId, -amount);
      add(tx.toWalletId, Number(tx.toAmount ?? tx.amount) || 0);
    }
  }
  const updatedWallets = wallets.map((w) => ({ ...w, currentBalance: balances.get(w.id) ?? 0 }));

  return {
    wallets: updatedWallets,
    categories: categories || loadCategories(),
    transactions,
  };
}
