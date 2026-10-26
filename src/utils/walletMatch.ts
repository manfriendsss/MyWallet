import type { Wallet } from '../types';

const fold = (value: string) =>
  value
    .normalize('NFD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .trim();

/** Words that say what kind of wallet it is, not which one ("thẻ Visa VIB" is told apart by "visa", "vib") */
const GENERIC = new Set(['the', 'vi', 'tien', 'tai', 'khoan', 'ngan', 'hang', 'cua', 'toi', 'cash', 'card', 'wallet', 'bank']);

/** Kept with their accents: without them "mặt" (Tiền mặt) and "mất" would be the same word */
const distinctiveWords = (name: string) =>
  name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= 2 && !GENERIC.has(fold(w)));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Spending on "the card" / "thẻ tín dụng" with no name: the only credit card, if there is just one */
const CARD_WORDS = /\b(the tin dung|credit card|quet the|ca the|the visa|the master|tra bang the)\b/;

function onlyCard(wallets: Wallet[]) {
  const cards = wallets.filter((w) => w.kind === 'credit');
  return cards.length === 1 ? cards[0] : undefined;
}

/**
 * The wallet a free sentence talks about ("phở 50k quẹt thẻ Visa"), or undefined.
 * Full names win over single distinctive words; longer names win so "Tiền mặt USD" beats "Tiền mặt".
 */
export function walletMentionedIn(text: string, wallets: Wallet[]): Wallet | undefined {
  const t = ` ${fold(text)} `;
  const byLength = [...wallets].sort((a, b) => b.name.length - a.name.length);
  const full = byLength.find((w) => t.includes(fold(w.name)));
  if (full) return full;
  const lower = ` ${text.toLowerCase()} `;
  const word = byLength.find((w) =>
    distinctiveWords(w.name).some((d) => new RegExp(`[^\\p{L}\\p{N}]${escapeRegExp(d)}[^\\p{L}\\p{N}]`, 'u').test(lower))
  );
  if (word) return word;
  return CARD_WORDS.test(t) ? onlyCard(wallets) : undefined;
}

/** The wallet an AI answer named, tolerating shortened or reworded names ("Visa" for "Thẻ Visa VIB") */
export function walletByName(name: string | undefined, wallets: Wallet[]): Wallet | undefined {
  const wanted = fold(name ?? '');
  if (!wanted) return undefined;
  return (
    wallets.find((w) => fold(w.name) === wanted) ||
    wallets.find((w) => fold(w.name).includes(wanted) || wanted.includes(fold(w.name))) ||
    walletMentionedIn(name ?? '', wallets) ||
    (/\b(the|card|credit|tin dung)\b/.test(wanted) ? onlyCard(wallets) : undefined)
  );
}
