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
  /** Expense categories: monthly spending limit in VND (undefined = no budget) */
  budget?: number;
}

export interface Transaction {
  id: string;
  type: EntryType;
  amount: number; // in original currency
  currency: CurrencyCode;
  amountVnd: number; // converted to VND at the time of creation
  exchangeRate: number; // rate used: 1 unit of currency = X VND
  /** Amount applied to the source wallet balance when the purchase currency differs (for example, a foreign-currency card charge). */
  walletAmount?: number;
  /** For a transfer: the wallet the money leaves */
  walletId: string;
  /** Transfer only: the wallet the money arrives in */
  toWalletId?: string;
  /** Transfer only: the amount arriving, in the destination wallet's currency */
  toAmount?: number;
  /** True when toAmount was calculated from the saved exchange rate rather than entered as the actual received amount. */
  toAmountEstimated?: boolean;
  categoryId: string;
  date: string; // ISO string or YYYY-MM-DD
  time?: string; // HH:mm
  note?: string;
  receiptUrl?: string; // photo/bill attachment URL
  /** Receipt photo stored privately in R2; fetched through /api/receipts/<key> */
  receiptKey?: string;
  /** A fee entry created alongside a transfer points back at it */
  transferId?: string;
  isAiGenerated?: boolean;
  createdAt: string;
}

/** Options when moving money between your own wallets */
export interface TransferOptions {
  /** What actually arrived, in the destination wallet's currency (defaults to the market conversion) */
  toAmount?: number;
  /** Fee charged, in the source wallet's currency; recorded as a separate expense under the fees category */
  fee?: number;
  note?: string;
  /** YYYY-MM-DD, defaults to today */
  date?: string;
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
  type: EntryType;
  amount: number;
  currency: CurrencyCode;
  categoryName: string;
  /** For a transfer: the wallet the money leaves */
  walletName?: string;
  /** Transfers only: the wallet the money arrives in, what arrived there and any fee (in the source currency) */
  toWalletName?: string;
  toAmount?: number;
  fee?: number;
  note: string;
  date: string;
  confidence: number; // 0 to 1
  rawText?: string;
}

export type ActiveTab = 'dashboard' | 'calendar' | 'analytics' | 'settings' | 'transactions';
