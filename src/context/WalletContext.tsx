import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
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
  isRatesStale,
  DEFAULT_EXCHANGE_RATES,
} from '../services/currency';
import {
  getStoredAiSettings,
  saveStoredAiSettings,
  clearStoredAiKeys,
  DEFAULT_AI_SETTINGS,
} from '../services/ai';
import {
  initializeStorageIfNeeded,
  saveWallets,
  saveCategories,
  saveTransactions,
  recalculateWalletBalances,
  INITIAL_CATEGORIES,
} from '../services/storage';
import { newId } from '../utils/date';
import { dataApi, type SyncKey } from '../services/api';

interface WalletContextType {
  // Navigation & UI state
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isAssistantOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;

  // Data
  isReady: boolean;
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
  syncStatus: SyncStatus;
  refreshAll: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export type SyncStatus = 'loading' | 'saving' | 'saved' | 'error' | 'offline';

/** The settings worth syncing across devices; API keys never leave this browser */
function pickPreferences(s: Partial<AiSettings>): Partial<AiSettings> {
  const out: Partial<AiSettings> = {};
  if (s.provider === 'gemini' || s.provider === 'deepseek') out.provider = s.provider;
  if (typeof s.geminiModel === 'string') out.geminiModel = s.geminiModel;
  if (typeof s.deepseekModel === 'string') out.deepseekModel = s.deepseekModel;
  if (s.keySource === 'server' || s.keySource === 'browser') out.keySource = s.keySource;
  return out;
}

export const WalletProvider: React.FC<{ children: React.ReactNode; syncEnabled?: boolean }> = ({
  children,
  syncEnabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEnabled ? 'loading' : 'offline');
  // The server copy has been loaded (or seeded): from here on, local changes are pushed up
  const syncedRef = useRef(false);
  const lastPushed = useRef<Partial<Record<SyncKey, string>>>({});
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);

  const [isReady, setIsReady] = useState<boolean>(false);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [exchangeRates, setExchangeRatesState] = useState<ExchangeRates>(getStoredExchangeRates());
  const [aiSettings, setAiSettingsState] = useState<AiSettings>(getStoredAiSettings());

  /**
   * Load the account's data from the database (the source of truth; this browser keeps a cache).
   * An empty account starts clean: no sample wallets or transactions, just the default categories.
   */
  const pullFromServer = async () => {
    const { data: remote } = await dataApi.load();
    const hasRemote = Array.isArray(remote.wallets?.value) || Array.isArray(remote.transactions?.value);
    const next = hasRemote
      ? recalculateWalletBalances(
          (remote.wallets?.value as Wallet[]) ?? [],
          (remote.transactions?.value as Transaction[]) ?? [],
          (remote.categories?.value as Category[]) ?? INITIAL_CATEGORIES
        )
      : { wallets: [] as Wallet[], categories: INITIAL_CATEGORIES, transactions: [] as Transaction[] };

    setWallets(next.wallets);
    setCategories(next.categories);
    setTransactions(next.transactions);
    saveWallets(next.wallets);
    saveCategories(next.categories);
    saveTransactions(next.transactions);

    if (!hasRemote) {
      await Promise.all([
        dataApi.save('wallets', next.wallets),
        dataApi.save('categories', next.categories),
        dataApi.save('transactions', next.transactions),
      ]);
    }
    lastPushed.current = {
      ...lastPushed.current,
      wallets: JSON.stringify(next.wallets),
      categories: JSON.stringify(next.categories),
      transactions: JSON.stringify(next.transactions),
    };

    const prefs = remote.preferences?.value as Partial<AiSettings> | undefined;
    if (prefs) {
      setAiSettingsState((cur) => {
        const merged = { ...cur, ...pickPreferences(prefs) };
        saveStoredAiSettings(merged);
        return merged;
      });
      lastPushed.current.preferences = JSON.stringify(pickPreferences(prefs));
    }
    syncedRef.current = true;
    setSyncStatus('saved');
  };

  // Initialize storage
  useEffect(() => {
    const data = initializeStorageIfNeeded();
    setWallets(data.wallets);
    setCategories(data.categories);
    setTransactions(data.transactions);

    if (!syncEnabled) {
      setIsReady(true);
    } else {
      pullFromServer()
        .catch(() => setSyncStatus('error'))
        .finally(() => setIsReady(true));
    }
    // Rates are always automatic: refresh on start, and again when the app comes back after a while
    const refreshIfStale = () => {
      if (!isRatesStale(getStoredExchangeRates())) return;
      fetchLiveExchangeRates().then((rates) => {
        if (rates) setExchangeRatesState(rates);
      });
    };
    refreshIfStale();
    const onVisible = () => document.visibilityState === 'visible' && refreshIfStale();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);


  // Push local changes to the database, batched: one save per changed document, shortly after the last edit
  useEffect(() => {
    if (!syncEnabled || !syncedRef.current) return;
    const docs: Record<SyncKey, unknown> = {
      wallets,
      categories,
      transactions,
      preferences: pickPreferences(aiSettings),
    };
    const changed = (Object.keys(docs) as SyncKey[]).filter((k) => JSON.stringify(docs[k]) !== lastPushed.current[k]);
    if (changed.length === 0) return;

    setSyncStatus('saving');
    const timer = setTimeout(() => {
      Promise.all(
        changed.map(async (k) => {
          const text = JSON.stringify(docs[k]);
          await dataApi.save(k, docs[k]);
          lastPushed.current[k] = text;
        })
      )
        .then(() => setSyncStatus('saved'))
        .catch(() => setSyncStatus('error'));
    }, 800);
    return () => clearTimeout(timer);
  }, [wallets, categories, transactions, aiSettings, syncEnabled]);

  /** Pull-to-refresh: fresh data from the database and fresh exchange rates */
  const refreshAll = async () => {
    const rates = fetchLiveExchangeRates().then((r) => {
      if (r) setExchangeRatesState(r);
    });
    if (syncEnabled) {
      setSyncStatus('loading');
      try {
        await pullFromServer();
      } catch {
        setSyncStatus('error');
      }
    }
    await rates;
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
      id: newId('tx'),
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
      id: newId('w'),
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
      id: newId('c'),
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
    clearStoredAiKeys();
    const data = initializeStorageIfNeeded();
    setWallets(data.wallets);
    setCategories(data.categories);
    setTransactions(data.transactions);
    setExchangeRatesState(DEFAULT_EXCHANGE_RATES);
    fetchLiveExchangeRates().then((rates) => {
      if (rates) setExchangeRatesState(rates);
    });
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
        isReady,
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
        syncStatus,
        refreshAll,
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
