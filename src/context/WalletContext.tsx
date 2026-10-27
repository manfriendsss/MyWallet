import React, { createContext, useCallback, useContext, useEffect, useRef, useState, useMemo } from 'react';
import type {
  ActiveTab,
  AiSettings,
  Category,
  ExchangeRates,
  Transaction,
  TransferOptions,
  Wallet,
} from '../types';
import {
  getStoredExchangeRates,
  saveStoredExchangeRates,
  convertToVnd,
  convertCurrency,
  convertForWallet,
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
  FEE_CATEGORY,
  loadWallets,
  loadCategories,
  loadTransactions,
} from '../services/storage';
import { newId, toLocalISODate } from '../utils/date';
import { dataApi, type SyncKey } from '../services/api';
import {
  APP_HISTORY_KEY,
  readAppHistoryEntry,
  withoutDialogHistory,
  type AppHistoryEntry,
} from '../utils/appHistory';

interface WalletContextType {
  // Navigation & UI state
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  goBack: () => void;
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
  totalDebtVnd: number;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id' | 'amountVnd' | 'exchangeRate' | 'createdAt'>) => Transaction;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  /** Returns what was removed (a transfer takes its fee with it), for undo */
  deleteTransaction: (id: string) => Transaction[];
  restoreTransactions: (restored: Transaction[]) => void;
  /** What arrives in the destination wallet at today's rates */
  previewTransferAmount: (fromWalletId: string, toWalletId: string, amount: number) => number;
  /** Move money between your own wallets, e.g. paying off a credit card. Never counted as spending. */
  addTransfer: (fromWalletId: string, toWalletId: string, amount: number, options?: TransferOptions) => void;

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

// --- Offline queue ---------------------------------------------------------------
// Documents changed on this device but not yet confirmed by the server. Kept in localStorage,
// so an edit made offline survives closing the app and is pushed before anything is pulled.
const PENDING_KEY = 'mywallet_sync_pending';
const ALL_KEYS: SyncKey[] = ['wallets', 'categories', 'transactions', 'preferences'];

function readPending(): Set<SyncKey> {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]');
    return new Set((Array.isArray(raw) ? raw : []).filter((k): k is SyncKey => ALL_KEYS.includes(k)));
  } catch {
    return new Set();
  }
}
function writePending(keys: Set<SyncKey>) {
  try {
    if (keys.size) localStorage.setItem(PENDING_KEY, JSON.stringify([...keys]));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // storage unavailable: nothing to persist
  }
}
function markPending(...keys: SyncKey[]) {
  const pending = readPending();
  keys.forEach((k) => pending.add(k));
  writePending(pending);
}
function clearPending(key: SyncKey) {
  const pending = readPending();
  pending.delete(key);
  writePending(pending);
}

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
  const [activeTab, setActiveTabState] = useState<ActiveTab>(
    () => readAppHistoryEntry(window.history.state)?.tab ?? 'dashboard'
  );
  const activeTabRef = useRef(activeTab);
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

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Tabs are real navigation levels even though this is a single-page app.
  // This makes browser/Android back retrace menus and only leave from Home.
  useEffect(() => {
    const existing = readAppHistoryEntry(window.history.state);
    if (!existing) {
      const initial: AppHistoryEntry = { tab: 'dashboard', depth: 0 };
      window.history.replaceState(
        { ...withoutDialogHistory(window.history.state), [APP_HISTORY_KEY]: initial },
        '',
        window.location.href
      );
      activeTabRef.current = 'dashboard';
      setActiveTabState('dashboard');
    }

    const onPopState = (event: PopStateEvent) => {
      const entry = readAppHistoryEntry(event.state);
      if (!entry || entry.tab === activeTabRef.current) return;
      activeTabRef.current = entry.tab;
      setActiveTabState(entry.tab);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setActiveTab = useCallback((tab: ActiveTab) => {
    if (tab === activeTabRef.current) return;

    const current = readAppHistoryEntry(window.history.state);
    const next: AppHistoryEntry = { tab, depth: (current?.depth ?? 0) + 1 };
    window.history.pushState(
      { ...withoutDialogHistory(window.history.state), [APP_HISTORY_KEY]: next },
      '',
      window.location.href
    );
    activeTabRef.current = tab;
    setActiveTabState(tab);
  }, []);

  const goBack = useCallback(() => {
    const current = readAppHistoryEntry(window.history.state);
    if (current && current.depth > 0) {
      window.history.back();
      return;
    }

    if (activeTabRef.current !== 'dashboard') {
      const home: AppHistoryEntry = { tab: 'dashboard', depth: 0 };
      window.history.replaceState(
        { ...withoutDialogHistory(window.history.state), [APP_HISTORY_KEY]: home },
        '',
        window.location.href
      );
      activeTabRef.current = 'dashboard';
      setActiveTabState('dashboard');
    }
  }, []);

  /** Send every document still marked pending, from this browser's saved copy */
  const flushPending = async () => {
    const pending = readPending();
    if (pending.size === 0) return;
    const local: Record<SyncKey, () => unknown> = {
      wallets: loadWallets,
      categories: loadCategories,
      transactions: loadTransactions,
      preferences: () => pickPreferences(getStoredAiSettings()),
    };
    for (const key of pending) {
      const value = local[key]();
      await dataApi.save(key, value);
      clearPending(key);
      lastPushed.current[key] = JSON.stringify(value);
    }
  };

  /**
   * Load the account's data from the database (the source of truth; this browser keeps a cache).
   * An empty account starts clean: no sample wallets or transactions, just the default categories.
   */
  const pullFromServer = async () => {
    // Local edits that never reached the server win: push them first, and stop if that fails
    await flushPending();
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


  // Back online: send whatever was changed while offline
  useEffect(() => {
    if (!syncEnabled) return;
    const onOnline = () => {
      if (readPending().size === 0) return;
      setSyncStatus('saving');
      flushPending()
        .then(() => setSyncStatus('saved'))
        .catch(() => setSyncStatus('error'));
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [syncEnabled]);

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
          clearPending(k);
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
    markPending('wallets', 'transactions', ...(newCats ? (['categories'] as SyncKey[]) : []));
    const catsToUse = newCats || categories;
    const recalculated = recalculateWalletBalances(newWallets, newTxs, catsToUse);
    setWallets(recalculated.wallets);
    setTransactions(recalculated.transactions);
    if (newCats) setCategories(recalculated.categories);

    saveWallets(recalculated.wallets);
    saveTransactions(recalculated.transactions);
    if (newCats) saveCategories(recalculated.categories);
  };

  /** VND value of an amount recorded in a wallet: PayPal wallets get PayPal's rate for their own currency */
  const toVndFor = (amount: number, currency: string, walletId: string) => {
    const wallet = wallets.find((w) => w.id === walletId);
    return wallet && wallet.currency === currency
      ? convertForWallet(amount, wallet, exchangeRates)
      : convertToVnd(amount, currency, exchangeRates);
  };

  /** Amount that affects the wallet's own balance, which can differ for foreign-currency card purchases. */
  const toWalletAmount = (amount: number, currency: string, walletId: string) => {
    const wallet = wallets.find((candidate) => candidate.id === walletId);
    if (!wallet || wallet.currency === currency) return amount;
    return convertCurrency(amount, currency, wallet.currency, exchangeRates);
  };

  // Transactions Actions
  const addTransaction = (
    txData: Omit<Transaction, 'id' | 'amountVnd' | 'exchangeRate' | 'createdAt'>
  ): Transaction => {
    const { amountVnd, rateUsed } = toVndFor(txData.amount, txData.currency, txData.walletId);
    const walletAmount = txData.type === 'transfer'
      ? undefined
      : toWalletAmount(txData.amount, txData.currency, txData.walletId);
    const newTx: Transaction = {
      ...txData,
      walletAmount,
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
    let walletAmount = target.walletAmount;

    if (updates.amount !== undefined || updates.currency !== undefined) {
      const curr = updates.currency || target.currency;
      const amt = updates.amount !== undefined ? updates.amount : target.amount;
      const converted = toVndFor(amt, curr, updates.walletId ?? target.walletId);
      amountVnd = converted.amountVnd;
      exchangeRate = converted.rateUsed;
    }

    const nextType = updates.type ?? target.type;
    if (
      nextType !== 'transfer' &&
      (updates.amount !== undefined || updates.currency !== undefined || updates.walletId !== undefined)
    ) {
      walletAmount = toWalletAmount(
        updates.amount ?? target.amount,
        updates.currency ?? target.currency,
        updates.walletId ?? target.walletId
      );
    }

    const newTxs = transactions.map((t) =>
      t.id === id ? { ...t, ...updates, amountVnd, exchangeRate, walletAmount } : t
    );
    syncState(wallets, newTxs);
  };

  /**
   * Deletes an entry (and, for a transfer, the fee recorded with it).
   * Returns what was removed so the caller can offer an undo with restoreTransactions.
   */
  const deleteTransaction = (id: string): Transaction[] => {
    const removed = transactions.filter((t) => t.id === id || t.transferId === id);
    syncState(wallets, transactions.filter((t) => !removed.includes(t)));
    return removed;
  };

  /** Puts back entries removed by deleteTransaction (undo) */
  const restoreTransactions = (restored: Transaction[]) => {
    const ids = new Set(transactions.map((t) => t.id));
    const merged = [...restored.filter((t) => !ids.has(t.id)), ...transactions].sort(
      (a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '') || b.createdAt.localeCompare(a.createdAt)
    );
    syncState(wallets, merged);
  };

  /** What arrives in `to` when `amount` leaves `from`, at today's rates (PayPal at its own rate) */
  const previewTransferAmount = (fromWalletId: string, toWalletId: string, amount: number): number => {
    const from = wallets.find((w) => w.id === fromWalletId);
    const to = wallets.find((w) => w.id === toWalletId);
    if (!from || !to || !(amount > 0)) return 0;
    if (from.currency === to.currency) return amount;
    const { amountVnd } = convertForWallet(amount, from, exchangeRates);
    const toRate = convertForWallet(1, to, exchangeRates).rateUsed || 1;
    return Math.round((amountVnd / toRate) * 100) / 100;
  };

  /**
   * Moves money between your own wallets (paying a card, topping up PayPal, cash from an ATM).
   * The arriving amount can differ from the market conversion (PayPal's rate, the bank's rate):
   * pass what actually arrived as `toAmount`. A fee is recorded as a separate expense, since it is real spending.
   */
  const addTransfer = (fromWalletId: string, toWalletId: string, amount: number, options: TransferOptions = {}) => {
    const from = wallets.find((w) => w.id === fromWalletId);
    const to = wallets.find((w) => w.id === toWalletId);
    if (!from || !to || !(amount > 0) || from.id === to.id) return;

    const { amountVnd, rateUsed } = convertForWallet(amount, from, exchangeRates);
    const hasActualToAmount = options.toAmount !== undefined && options.toAmount > 0;
    const toAmount = hasActualToAmount
      ? options.toAmount
      : previewTransferAmount(fromWalletId, toWalletId, amount);
    const now = new Date();
    const date = options.date ?? toLocalISODate(now);
    const time = now.toTimeString().slice(0, 5);

    const transfer: Transaction = {
      id: newId('tx'),
      type: 'transfer',
      amount,
      currency: from.currency,
      amountVnd,
      exchangeRate: rateUsed,
      walletId: from.id,
      toWalletId: to.id,
      toAmount,
      toAmountEstimated: from.currency !== to.currency && !hasActualToAmount,
      categoryId: '',
      date,
      time,
      note: options.note?.trim() || (to.kind === 'credit' ? `Trả nợ thẻ ${to.name}` : `Chuyển sang ${to.name}`),
      createdAt: now.toISOString(),
    };

    const entries: Transaction[] = [transfer];
    let nextCategories: Category[] | undefined;
    if (options.fee && options.fee > 0) {
      let feeCategory = categories.find((c) => c.id === FEE_CATEGORY.id);
      if (!feeCategory) {
        feeCategory = FEE_CATEGORY;
        nextCategories = [...categories, FEE_CATEGORY];
      }
      const fee = convertForWallet(options.fee, from, exchangeRates);
      entries.push({
        id: newId('tx'),
        type: 'expense',
        amount: options.fee,
        currency: from.currency,
        amountVnd: fee.amountVnd,
        exchangeRate: fee.rateUsed,
        walletId: from.id,
        categoryId: feeCategory.id,
        date,
        time,
        note: `Phí chuyển sang ${to.name}`,
        transferId: transfer.id,
        createdAt: now.toISOString(),
      });
    }
    syncState(wallets, [...entries, ...transactions], nextCategories);
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

  /** Removes the wallet and the entries recorded in or sent to it, so no totals point at a wallet that is gone */
  const deleteWallet = (id: string) => {
    const newWallets = wallets.filter((w) => w.id !== id);
    syncState(
      newWallets,
      transactions.filter((t) => t.walletId !== id && t.toWalletId !== id)
    );
  };

  // Categories Actions
  const addCategory = (categoryData: Omit<Category, 'id'>): Category => {
    const newCat: Category = {
      ...categoryData,
      id: newId('c'),
    };
    const newCats = [...categories, newCat];
    markPending('categories');
    setCategories(newCats);
    saveCategories(newCats);
    return newCat;
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    const newCats = categories.map((c) => (c.id === id ? { ...c, ...updates } : c));
    markPending('categories');
    setCategories(newCats);
    saveCategories(newCats);
  };

  const deleteCategory = (id: string) => {
    const newCats = categories.filter((c) => c.id !== id);
    markPending('categories');
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
    markPending('preferences');
    setAiSettingsState(merged);
    saveStoredAiSettings(merged);
  };

  const resetAllData = () => {
    localStorage.clear();
    clearStoredAiKeys();
    markPending(...ALL_KEYS);
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

  // Calculated totals in VND. The balance is net worth: card debt (negative balances) is subtracted.
  const totalBalanceVnd = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const { amountVnd } = convertForWallet(w.currentBalance, w, exchangeRates);
      return sum + amountVnd;
    }, 0);
  }, [wallets, exchangeRates]);

  /** What is owed on credit cards, as a positive VND amount */
  const totalDebtVnd = useMemo(() => {
    return wallets.reduce((sum, w) => {
      if (w.kind !== 'credit' || w.currentBalance >= 0) return sum;
      return sum + convertForWallet(-w.currentBalance, w, exchangeRates).amountVnd;
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
        } else if (tx.type === 'expense') {
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
        goBack,
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
        totalDebtVnd,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        restoreTransactions,
        previewTransferAmount,
        addTransfer,
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
