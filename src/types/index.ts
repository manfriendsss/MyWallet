// src/types/index.ts

export type TransactionType = 'income' | 'expense';

export type CurrencyCode = 'VND' | 'USD' | 'PLN' | 'EUR' | 'GBP' | 'JPY';

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
  VND: number;
  USD: number;
  PLN: number;
  EUR: number;
  GBP: number;
  JPY: number;
  lastUpdated: string;
}

export type AiProvider = 'gemini' | 'deepseek';

export interface AiSettings {
  provider: AiProvider;
  geminiApiKey: string;
  geminiModel: string;
  deepseekApiKey: string;
  deepseekModel: string;
  useCloudflareProxy?: boolean;
  cloudflareWorkerUrl?: string;
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
