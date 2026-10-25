// src/types/index.ts

/** Money in or out: what categories and statistics are about */
export type TransactionType = 'income' | 'expense';

/** Every ledger entry. A transfer moves money between your own wallets (e.g. paying off a card) and is never spending. */
export type EntryType = TransactionType | 'transfer';

/** ISO 4217 code: VND, USD, EUR, CNY, JPY, PLN, CZK… any currency with an online rate */
export type CurrencyCode = string;

export interface Wallet {
  id: string;
  name: string;
  currency: CurrencyCode;
  /** For a credit card this is negative: the debt when the card was added */
  initialBalance: number;
  /** For a credit card, negative means money owed */
  currentBalance: number;
  color: string;
  icon: string; // lucide icon name
  isDefault?: boolean;
  /** 'credit': a credit card, whose balance is debt */
  kind?: 'cash' | 'credit';
  /** Credit limit of a card, in its currency */
  creditLimit?: number;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  type: EntryType;
  amount: number; // in original currency
  currency: CurrencyCode;
  amountVnd: number; // converted to VND at the time of creation
  exchangeRate: number; // rate used: 1 unit of currency = X VND
  /** For a transfer: the wallet the money leaves */
  walletId: string;
  /** Transfer only: the wallet the money arrives in */
  toWalletId?: string;
  /** Transfer only: the amount arriving, in the destination wallet's currency */
  toAmount?: number;
  categoryId: string;
  date: string; // ISO string or YYYY-MM-DD
  time?: string; // HH:mm
  note?: string;
  receiptUrl?: string; // photo/bill attachment URL
  isAiGenerated?: boolean;
  createdAt: string;
}

export interface ExchangeRates {
  /** How many VND one unit of each currency buys. VND itself is 1. */
  rates: Record<string, number>;
  lastUpdated: string;
  source?: 'default' | 'live';
}

export type AiProvider = 'gemini' | 'deepseek';

export interface AiSettings {
  provider: AiProvider;
  geminiApiKey: string;
  geminiModel: string;
  deepseekApiKey: string;
  deepseekModel: string;
  /** false: API keys live in sessionStorage and vanish when the tab closes */
  rememberKeys: boolean;
  /** 'server': keys are Cloudflare secrets and calls go through /api/ai/*; 'browser': keys typed in the app */
  keySource: 'server' | 'browser';
}

export interface ParsedTransactionFromAi {
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  categoryName: string;
  walletName?: string;
  note: string;
  date: string;
  confidence: number; // 0 to 1
  rawText?: string;
}

export type ActiveTab = 'dashboard' | 'calendar' | 'analytics' | 'settings';
