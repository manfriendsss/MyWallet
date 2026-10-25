import type { CurrencyCode, ExchangeRates } from '../types';

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  VND: 1,
  USD: 25450,
  PLN: 6350,
  EUR: 27500,
  GBP: 32800,
  JPY: 168,
  lastUpdated: new Date().toISOString(),
};

const STORAGE_KEY_RATES = 'mywallet_exchange_rates';

export function getStoredExchangeRates(): ExchangeRates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.USD === 'number') {
        return parsed;
      }
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

export function convertToVnd(
  amount: number,
  currency: CurrencyCode,
  rates: ExchangeRates = getStoredExchangeRates()
): { amountVnd: number; rateUsed: number } {
  if (currency === 'VND') {
    return { amountVnd: amount, rateUsed: 1 };
  }

  const rate = rates[currency] || DEFAULT_EXCHANGE_RATES[currency] || 1;
  const amountVnd = Math.round(amount * rate);

  return { amountVnd, rateUsed: rate };
}

export async function fetchLiveExchangeRates(): Promise<ExchangeRates | null> {
  try {
    // Try open exchange rate API with USD base
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!res.ok) throw new Error('API network response was not ok');
    const data = await res.json();

    if (data && data.rates && data.rates.VND) {
      const usdVnd = data.rates.VND;
      const newRates: ExchangeRates = {
        VND: 1,
        USD: Math.round(usdVnd),
        PLN: Math.round(usdVnd / (data.rates.PLN || 4.0)),
        EUR: Math.round(usdVnd / (data.rates.EUR || 0.92)),
        GBP: Math.round(usdVnd / (data.rates.GBP || 0.78)),
        JPY: Math.round(usdVnd / (data.rates.JPY || 152)),
        lastUpdated: new Date().toISOString(),
      };
      saveStoredExchangeRates(newRates);
      return newRates;
    }
  } catch (e) {
    console.warn('Could not fetch live rates, using cached or default:', e);
  }
  return null;
}
