// src/types/index.ts

export type TransactionType = 'income' | 'expense';

/** ISO 4217 code: VND, USD, EUR, CNY, JPY, PLN, CZK… any currency with an online rate */
export type CurrencyCode = string;

export interface Wallet {
  id: string;
  name: string;
  currency: CurrencyCode;
  initialBalance: number;
  currentBalance: number;
  color: string;
  icon: string; // lucide icon name
  isDefault?: boolean;
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
  type: TransactionType;
  amount: number; // in original currency
  currency: CurrencyCode;
  amountVnd: number; // converted to VND at the time of creation
  exchangeRate: number; // rate used: 1 unit of currency = X VND
  walletId: string;
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
