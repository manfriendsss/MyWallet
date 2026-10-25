import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type {
  ActiveTab,
  AiSettings,
  Category,
  ExchangeRates,
  Transaction,
  Wallet,
} from '../types';
import {
  getStoredExchangeRates,
  saveStoredExchangeRates,
  convertToVnd,
  fetchLiveExchangeRates,
  DEFAULT_EXCHANGE_RATES,
} from '../services/currency';
import {
  getStoredAiSettings,
  saveStoredAiSettings,
  DEFAULT_AI_SETTINGS,
} from '../services/ai';
import {
  initializeStorageIfNeeded,
  saveWallets,
  saveCategories,
  saveTransactions,
  recalculateWalletBalances,
} from '../services/storage';

interface WalletContextType {
  // Navigation & UI state
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isAssistantOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  isBalanceHidden: boolean;
  toggleBalanceHidden: () => void;

  // Data
  wallets: Wallet[];
  categories: Category[];
  transactions: Transaction[];
  exchangeRates: ExchangeRates;
  aiSettings: AiSettings;

  // Computed Totals in VND
  totalBalanceVnd: number;
  totalIncomeThisMonthVnd: number;
  totalExpenseThisMonthVnd: number;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'amountVnd' | 'exchangeRate' | 'createdAt'>) => Transaction;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addWallet: (wallet: Omit<Wallet, 'id' | 'currentBalance'>) => Wallet;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  deleteWallet: (id: string) => void;

  addCategory: (category: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  updateExchangeRates: (rates: ExchangeRates) => void;
  refreshExchangeRates: () => Promise<boolean>;
  updateAiSettings: (settings: Partial<AiSettings>) => void;
  resetAllData: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(() => {
    return localStorage.getItem('mywallet_hide_balance') === 'true';
  });

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exchangeRates, setExchangeRatesState] = useState<ExchangeRates>(getStoredExchangeRates());
  const [aiSettings, setAiSettingsState] = useState<AiSettings>(getStoredAiSettings());

  // Initialize storage
  useEffect(() => {
    const data = initializeStorageIfNeeded();
    setWallets(data.wallets);
    setCategories(data.categories);
    setTransactions(data.transactions);

    // Auto-fetch fresh rates on startup silently
    fetchLiveExchangeRates().then((rates) => {
      if (rates) setExchangeRatesState(rates);
    });
  }, []);

  const toggleBalanceHidden = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      localStorage.setItem('mywallet_hide_balance', String(next));
      return next;
    });
  };

  const openAssistant = () => setIsAssistantOpen(true);
  const closeAssistant = () => setIsAssistantOpen(false);

  // Recalculate helper
  const syncState = (newWallets: Wallet[], newTxs: Transaction[], newCats?: Category[]) => {
    const catsToUse = newCats || categories;
    const recalculated = recalculateWalletBalances(newWallets, newTxs, catsToUse);
    setWallets(recalculated.wallets);
    setTransactions(recalculated.transactions);
    if (newCats) setCategories(recalculated.categories);

    saveWallets(recalculated.wallets);
    saveTransactions(recalculated.transactions);
    if (newCats) saveCategories(recalculated.categories);
  };

  // Transactions Actions
  const addTransaction = (
    txData: Omit<Transaction, 'id' | 'amountVnd' | 'exchangeRate' | 'createdAt'>
  ): Transaction => {
    const { amountVnd, rateUsed } = convertToVnd(txData.amount, txData.currency, exchangeRates);
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      amountVnd,
      exchangeRate: rateUsed,
      createdAt: new Date().toISOString(),
    };

    const newTxs = [newTx, ...transactions];
    syncState(wallets, newTxs);
    return newTx;
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;

    let amountVnd = target.amountVnd;
    let exchangeRate = target.exchangeRate;

    if (updates.amount !== undefined || updates.currency !== undefined) {
      const curr = updates.currency || target.currency;
      const amt = updates.amount !== undefined ? updates.amount : target.amount;
      const converted = convertToVnd(amt, curr, exchangeRates);
      amountVnd = converted.amountVnd;
      exchangeRate = converted.rateUsed;
    }

    const newTxs = transactions.map((t) =>
      t.id === id ? { ...t, ...updates, amountVnd, exchangeRate } : t
    );
    syncState(wallets, newTxs);
  };

  const deleteTransaction = (id: string) => {
    const newTxs = transactions.filter((t) => t.id !== id);
    syncState(wallets, newTxs);
  };

  // Wallets Actions
  const addWallet = (walletData: Omit<Wallet, 'id' | 'currentBalance'>): Wallet => {
    const newWallet: Wallet = {
      ...walletData,
      id: `w-${Date.now()}`,
      currentBalance: Number(walletData.initialBalance) || 0,
    };
    const newWallets = [...wallets, newWallet];
    syncState(newWallets, transactions);
    return newWallet;
  };

  const updateWallet = (id: string, updates: Partial<Wallet>) => {
    const newWallets = wallets.map((w) => (w.id === id ? { ...w, ...updates } : w));
    syncState(newWallets, transactions);
  };

  const deleteWallet = (id: string) => {
    const newWallets = wallets.filter((w) => w.id !== id);
    syncState(newWallets, transactions);
  };

  // Categories Actions
  const addCategory = (categoryData: Omit<Category, 'id'>): Category => {
    const newCat: Category = {
      ...categoryData,
      id: `c-${Date.now()}`,
    };
    const newCats = [...categories, newCat];
    setCategories(newCats);
    saveCategories(newCats);
    return newCat;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const newCats = categories.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setCategories(newCats);
    saveCategories(newCats);
  };

  const deleteCategory = (id: string) => {
    const newCats = categories.filter((c) => c.id !== id);
    setCategories(newCats);
    saveCategories(newCats);
  };

  // Rates & Settings
  const updateExchangeRates = (rates: ExchangeRates) => {
    setExchangeRatesState(rates);
    saveStoredExchangeRates(rates);
  };

  const refreshExchangeRates = async (): Promise<boolean> => {
    const fresh = await fetchLiveExchangeRates();
    if (fresh) {
      setExchangeRatesState(fresh);
      return true;
    }
    return false;
  };

  const updateAiSettings = (newSettings: Partial<AiSettings>) => {
    const merged = { ...aiSettings, ...newSettings };
    setAiSettingsState(merged);
    saveStoredAiSettings(merged);
  };

  const resetAllData = () => {
    localStorage.clear();
    const data = initializeStorageIfNeeded();
    setWallets(data.wallets);
    setCategories(data.categories);
    setTransactions(data.transactions);
    setExchangeRatesState(DEFAULT_EXCHANGE_RATES);
    setAiSettingsState(DEFAULT_AI_SETTINGS);
  };

  // Calculated totals in VND
  const totalBalanceVnd = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const { amountVnd } = convertToVnd(w.currentBalance, w.currency, exchangeRates);
      return sum + amountVnd;
    }, 0);
  }, [wallets, exchangeRates]);

  const { totalIncomeThisMonthVnd, totalExpenseThisMonthVnd } = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let inc = 0;
    let exp = 0;

    for (const tx of transactions) {
      if (tx.date.startsWith(currentYearMonth)) {
        if (tx.type === 'income') {
          inc += tx.amountVnd;
        } else {
          exp += tx.amountVnd;
        }
      }
    }

    return {
      totalIncomeThisMonthVnd: inc,
      totalExpenseThisMonthVnd: exp,
    };
  }, [transactions]);

  return (
    <WalletContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isAssistantOpen,
        openAssistant,
        closeAssistant,
        isBalanceHidden,
        toggleBalanceHidden,
        wallets,
        categories,
        transactions,
        exchangeRates,
        aiSettings,
        totalBalanceVnd,
        totalIncomeThisMonthVnd,
        totalExpenseThisMonthVnd,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addWallet,
        updateWallet,
        deleteWallet,
        addCategory,
        updateCategory,
        deleteCategory,
        updateExchangeRates,
        refreshExchangeRates,
        updateAiSettings,
        resetAllData,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
}
