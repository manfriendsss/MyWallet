import type { CurrencyCode, ExchangeRates, Wallet } from '../types';

/**
 * Offline fallback only: approximate VND per unit, replaced by the live table on the first successful fetch.
 */
export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  rates: {
    VND: 1,
    USD: 25450,
    EUR: 27500,
    GBP: 32800,
    JPY: 168,
    CNY: 3520,
    KRW: 18.5,
    PLN: 6350,
    CZK: 1100,
    HUF: 70,
    CHF: 29000,
    SEK: 2400,
    NOK: 2350,
    DKK: 3700,
    RON: 5500,
    THB: 700,
    SGD: 19500,
    HKD: 3270,
    TWD: 800,
    AUD: 16500,
    CAD: 18500,
  },
  lastUpdated: new Date(0).toISOString(),
  source: 'default',
};

const STORAGE_KEY_RATES = 'mywallet_exchange_rates';
/** Refresh the live table when it is older than this */
export const RATES_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** A rate is how many VND one unit buys: positive, finite and inside a sane band */
export function isValidRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100_000_000;
}

const isCode = (code: string) => /^[A-Z]{3}$/.test(code);

function sanitizeRates(input: unknown): ExchangeRates | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;

  // Older versions stored { USD, PLN, EUR, … } at the top level
  const table = (obj.rates && typeof obj.rates === 'object' ? obj.rates : obj) as Record<string, unknown>;
  const rates: Record<string, number> = { VND: 1 };
  for (const [code, value] of Object.entries(table)) {
    if (isCode(code) && isValidRate(value)) rates[code] = value;
  }
  if (Object.keys(rates).length < 2) return null;

  return {
    rates,
    lastUpdated: typeof obj.lastUpdated === 'string' ? obj.lastUpdated : new Date(0).toISOString(),
    source: obj.source === 'live' ? 'live' : 'default',
  };
}

export function getStoredExchangeRates(): ExchangeRates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATES);
    if (raw) {
      const parsed = sanitizeRates(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_EXCHANGE_RATES;
}

export function saveStoredExchangeRates(rates: ExchangeRates): void {
  try {
    localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(rates));
  } catch (err) {
    console.error('Failed to save exchange rates:', err);
  }
}

export function isRatesStale(rates: ExchangeRates): boolean {
  if (rates.source !== 'live') return true;
  const age = Date.now() - new Date(rates.lastUpdated).getTime();
  return !Number.isFinite(age) || age > RATES_MAX_AGE_MS;
}

export function getRate(currency: CurrencyCode, rates: ExchangeRates = getStoredExchangeRates()): number | null {
  if (currency === 'VND') return 1;
  const live = rates.rates[currency];
  if (isValidRate(live)) return live;
  const fallback = DEFAULT_EXCHANGE_RATES.rates[currency];
  return isValidRate(fallback) ? fallback : null;
}

export function convertToVnd(
  amount: number,
  currency: CurrencyCode,
  rates: ExchangeRates = getStoredExchangeRates()
): { amountVnd: number; rateUsed: number } {
  if (currency === 'VND') {
    return { amountVnd: amount, rateUsed: 1 };
  }
  const rate = getRate(currency, rates) ?? 0;
  return { amountVnd: Math.round(amount * rate), rateUsed: rate };
}

const ZERO_DECIMAL_CURRENCIES = new Set(['VND', 'JPY', 'KRW', 'HUF']);

/** Convert between two supported currencies while preserving the amount charged to a wallet. */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: ExchangeRates = getStoredExchangeRates()
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = getRate(fromCurrency, rates);
  const toRate = getRate(toCurrency, rates);
  if (!fromRate || !toRate) return 0;
  const converted = (amount * fromRate) / toRate;
  return ZERO_DECIMAL_CURRENCIES.has(toCurrency)
    ? Math.round(converted)
    : Math.round(converted * 100) / 100;
}

/** PayPal converts at about 97% of the market rate (its spread), not the bank rate */
export const PAYPAL_RATE_FACTOR = 0.97;

export function isPaypalWallet(wallet: Pick<Wallet, 'icon' | 'name'>): boolean {
  return wallet.icon === 'PayPal' || /paypal/i.test(wallet.name);
}

/** Sources that can pay in any currency and convert into their own balance: credit cards and PayPal */
export function isMultiCurrencyWallet(wallet: Pick<Wallet, 'icon' | 'name' | 'kind'>): boolean {
  return wallet.kind === 'credit' || isPaypalWallet(wallet);
}

/** The rate a given wallet actually gets: the market rate, or 97% of it for a PayPal balance */
export function convertForWallet(
  amount: number,
  wallet: Pick<Wallet, 'icon' | 'name' | 'currency'>,
  rates: ExchangeRates = getStoredExchangeRates()
): { amountVnd: number; rateUsed: number } {
  if (wallet.currency === 'VND' || !isPaypalWallet(wallet)) return convertToVnd(amount, wallet.currency, rates);
  const market = getRate(wallet.currency, rates) ?? 0;
  const rate = Math.round(market * PAYPAL_RATE_FACTOR * 10_000) / 10_000;
  return { amountVnd: Math.round(amount * rate), rateUsed: rate };
}

export async function fetchLiveExchangeRates(): Promise<ExchangeRates | null> {
  try {
    // One table, USD base, ~160 currencies
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error('API network response was not ok');
    const data = await res.json();
    const table = data?.rates;

    // The response is untrusted: a bad value would turn every balance into NaN
    if (!table || typeof table !== 'object' || !isValidRate(table.VND)) return null;
    const usdVnd: number = table.VND;
    const rates: Record<string, number> = { VND: 1 };
    for (const [code, perUsd] of Object.entries(table as Record<string, unknown>)) {
      if (code === 'VND' || !isCode(code) || !isValidRate(perUsd)) continue;
      const vndPerUnit = usdVnd / perUsd;
      if (isValidRate(vndPerUnit)) rates[code] = Math.round(vndPerUnit * 10_000) / 10_000;
    }

    const next = sanitizeRates({ rates, lastUpdated: new Date().toISOString(), source: 'live' });
    if (next) {
      saveStoredExchangeRates(next);
      return next;
    }
  } catch (e) {
    console.warn('Could not fetch live rates, using cached or default:', e);
  }
  return null;
}

// --- Currency list for pickers -------------------------------------------------

const POPULAR = ['VND', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'PLN', 'CZK', 'HUF', 'CHF', 'SEK', 'THB', 'SGD', 'AUD'];

let currencyNames: Intl.DisplayNames | null = null;
export function currencyName(code: string): string {
  try {
    currencyNames ??= new Intl.DisplayNames(['vi'], { type: 'currency' });
    return currencyNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Every currency the rate table knows, popular ones first */
export function getCurrencyOptions(rates: ExchangeRates): Array<{ value: string; label: string; hint: string }> {
  const codes = new Set([...Object.keys(DEFAULT_EXCHANGE_RATES.rates), ...Object.keys(rates.rates)]);
  const sorted = [
    ...POPULAR.filter((c) => codes.has(c)),
    ...[...codes].filter((c) => !POPULAR.includes(c)).sort(),
  ];
  return sorted.map((code) => ({ value: code, label: code, hint: currencyName(code) }));
}
