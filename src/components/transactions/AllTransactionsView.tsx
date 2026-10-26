import React, { useMemo, useState } from 'react';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { SlidersHorizontal } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import type { EntryType, Transaction } from '../../types';
import { toLocalISODate } from '../../utils/date';
import { formatShortDate, formatSigned } from '../../utils/formatters';
import { TransactionRow } from '../dashboard/TransactionRow';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { ToneTabs, type ToneTab } from '../ui/ToneTabs';
import { useToast } from '../ui/Toast';
import { Tooltip } from '../ui/Tooltip';
import { TransactionFormModal } from './TransactionForm';
import { TransactionDetailSheet } from './TransactionDetailSheet';

type TypeFilter = 'all' | EntryType;
type QuickRange = 'month' | 'previousMonth' | 'threeMonths' | 'all';
type DateRange = QuickRange | 'custom';

interface DateBounds {
  from: string;
  to: string;
}

interface TransactionGroup {
  date: string;
  transactions: Transaction[];
  net: number;
}

const PAGE_SIZE = 60;

const TYPE_TABS: Array<ToneTab<TypeFilter>> = [
  { id: 'all', label: 'Tất cả', tone: 'accent' },
  { id: 'income', label: 'Thu', tone: 'income' },
  { id: 'expense', label: 'Chi', tone: 'expense' },
  { id: 'transfer', label: 'Chuyển', tone: 'accent' },
];

const QUICK_RANGES: Array<{ id: QuickRange; label: string }> = [
  { id: 'month', label: 'Tháng này' },
  { id: 'previousMonth', label: 'Tháng trước' },
  { id: 'threeMonths', label: '3 tháng' },
  { id: 'all', label: 'Tất cả' },
];

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

const getDateBounds = (range: QuickRange): DateBounds => {
  if (range === 'all') return { from: '', to: '' };

  const now = new Date();
  const reference = range === 'previousMonth' ? subMonths(now, 1) : now;
  const from = range === 'threeMonths' ? startOfMonth(subMonths(now, 2)) : startOfMonth(reference);
  const to = endOfMonth(reference);

  return {
    from: toLocalISODate(from),
    to: toLocalISODate(to),
  };
};

export const AllTransactionsView: React.FC = () => {
  const { wallets, categories, transactions, deleteTransaction, restoreTransactions } = useWallet();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [walletFilter, setWalletFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [dateBounds, setDateBounds] = useState<DateBounds>(() => getDateBounds('month'));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const walletById = useMemo(() => new Map(wallets.map((wallet) => [wallet.id, wallet])), [wallets]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const selected = transactions.find((transaction) => transaction.id === selectedId);

  const walletOptions = useMemo(
    () => [
      { value: 'all', label: 'Tất cả ví' },
      ...wallets.map((wallet) => ({ value: wallet.id, label: wallet.name, hint: wallet.currency })),
    ],
    [wallets]
  );

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: 'Tất cả danh mục' },
      ...categories.map((category) => ({ value: category.id, label: category.name })),
    ],
    [categories]
  );

  const filteredTransactions = useMemo(() => {
    const query = normalizeSearch(search.trim());

    return transactions
      .filter((tx) => {
        const wallet = walletById.get(tx.walletId);
        const toWallet = tx.toWalletId ? walletById.get(tx.toWalletId) : undefined;
        const category = categoryById.get(tx.categoryId);
        const searchableText = normalizeSearch(
          [tx.note, category?.name, wallet?.name, toWallet?.name].filter(Boolean).join(' ')
        );
        const transactionDate = tx.date.slice(0, 10);

        if (query && !searchableText.includes(query)) return false;
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (walletFilter !== 'all' && tx.walletId !== walletFilter && tx.toWalletId !== walletFilter) return false;
        if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
        if (dateBounds.from && transactionDate < dateBounds.from) return false;
        if (dateBounds.to && transactionDate > dateBounds.to) return false;
        return true;
      })
      .toSorted(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.time ?? '').localeCompare(a.time ?? '') ||
          b.createdAt.localeCompare(a.createdAt)
      );
  }, [transactions, walletById, categoryById, search, typeFilter, walletFilter, categoryFilter, dateBounds]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const tx of filteredTransactions) {
      if (tx.type === 'income') income += tx.amountVnd;
      if (tx.type === 'expense') expense += tx.amountVnd;
    }

    return { income, expense };
  }, [filteredTransactions]);

  const filterPeriodLabel = useMemo(() => {
    const quickLabel = QUICK_RANGES.find((range) => range.id === dateRange)?.label;
    if (quickLabel) return quickLabel;
    if (dateBounds.from && dateBounds.to) return `${formatShortDate(dateBounds.from)} – ${formatShortDate(dateBounds.to)}`;
    return 'Khoảng ngày tùy chọn';
  }, [dateRange, dateBounds]);

  const visibleGroups = useMemo(() => {
    const groups = new Map<string, TransactionGroup>();

    for (const tx of filteredTransactions.slice(0, visibleCount)) {
      const date = tx.date.slice(0, 10);
      const existing = groups.get(date);
      const netChange = tx.type === 'income' ? tx.amountVnd : tx.type === 'expense' ? -tx.amountVnd : 0;

      if (existing) {
        existing.transactions.push(tx);
        existing.net += netChange;
      } else {
        groups.set(date, { date, transactions: [tx], net: netChange });
      }
    }

    return Array.from(groups.values());
  }, [filteredTransactions, visibleCount]);

  const resetPage = () => setVisibleCount(PAGE_SIZE);

  const selectQuickRange = (range: QuickRange) => {
    setDateRange(range);
    setDateBounds(getDateBounds(range));
    resetPage();
  };

  const updateDateBound = (key: keyof DateBounds, value: string) => {
    setDateRange('custom');
    setDateBounds((current) => ({ ...current, [key]: value }));
    resetPage();
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{filterPeriodLabel}</p>
            <p className="mt-0.5 text-xs text-muted">{filteredTransactions.length} giao dịch phù hợp</p>
          </div>
          {search.trim() && <span className="max-w-[45%] truncate rounded-pill bg-paper-3 px-2.5 py-1 text-xs text-muted">“{search.trim()}”</span>}
        </div>

        <dl className="grid grid-cols-2 border-t border-rule pt-4">
          <div className="pr-3">
            <dt className="text-sm text-muted">Tổng thu</dt>
            <dd className="figure mt-1 font-bold text-income">{formatSigned(totals.income, 'VND', '+')}</dd>
          </div>
          <div className="border-l border-rule pl-3">
            <dt className="text-sm text-muted">Tổng chi</dt>
            <dd className="figure mt-1 font-bold text-expense">{formatSigned(totals.expense, 'VND', '−')}</dd>
          </div>
        </dl>
      </Card>

      <ToneTabs
        tabs={TYPE_TABS}
        value={typeFilter}
        onChange={(value) => {
          setTypeFilter(value);
          resetPage();
        }}
        label="Lọc nhanh loại giao dịch"
      />

      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="text-base text-ink">Danh sách giao dịch</h2>
        <Tooltip content="Lọc và tìm kiếm giao dịch">
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-control border border-rule bg-surface text-muted transition-colors hover:bg-paper-3 hover:text-ink"
            aria-label="Lọc và tìm kiếm giao dịch"
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>

      <Card className="overflow-clip p-0 sm:p-0">
        {visibleGroups.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted sm:px-5">Không có giao dịch phù hợp.</p>
        ) : (
          <>
            {visibleGroups.map((group) => (
              <section key={group.date}>
                <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 flex items-center justify-between gap-3 border-y border-rule bg-paper/90 px-4 py-2 backdrop-blur sm:px-5">
                  <h2 className="text-sm font-semibold text-ink">{formatShortDate(group.date)}</h2>
                  <span className="figure text-sm text-muted">
                    {formatSigned(Math.abs(group.net), 'VND', group.net >= 0 ? '+' : '−')}
                  </span>
                </div>
                <ul className="divide-y divide-rule px-4 sm:px-5">
                  {group.transactions.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      category={categoryById.get(tx.categoryId)}
                      wallet={walletById.get(tx.walletId)}
                      toWallet={tx.toWalletId ? walletById.get(tx.toWalletId) : undefined}
                      showDate={false}
                      onEdit={setEditing}
                      onOpen={(transaction) => setSelectedId(transaction.id)}
                      onDelete={(id) => {
                        const removed = deleteTransaction(id);
                        showToast({
                          message: 'Đã xóa giao dịch',
                          actionLabel: 'Hoàn tác',
                          onAction: () => restoreTransactions(removed),
                        });
                      }}
                    />
                  ))}
                </ul>
              </section>
            ))}

            {visibleCount < filteredTransactions.length ? (
              <div className="border-t border-rule p-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                >
                  Xem thêm
                </Button>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <TransactionDetailSheet
        isOpen={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        onEdit={() => selected && setEditing(selected)}
        transaction={selected}
        category={selected ? categoryById.get(selected.categoryId) : undefined}
        wallet={selected ? walletById.get(selected.walletId) : undefined}
        toWallet={selected?.toWalletId ? walletById.get(selected.toWalletId) : undefined}
      />
      <TransactionFormModal isOpen={Boolean(editing)} onClose={() => setEditing(null)} transaction={editing ?? undefined} />
      <Modal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} title="Lọc giao dịch" description="Tìm theo ghi chú, danh mục, ví hoặc thời gian.">
        <div className="space-y-5">
          <div>
            <label htmlFor="tx-search" className="label">Tìm kiếm</label>
            <input
              id="tx-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder="Tìm ghi chú, danh mục, ví"
              className="field"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label id="wallet-filter-label" htmlFor="wallet-filter" className="label">Ví</label>
              <Select id="wallet-filter" aria-labelledby="wallet-filter-label" value={walletFilter} options={walletOptions} onChange={(value) => { setWalletFilter(value); resetPage(); }} searchable />
            </div>
            <div>
              <label id="category-filter-label" htmlFor="category-filter" className="label">Danh mục</label>
              <Select id="category-filter" aria-labelledby="category-filter-label" value={categoryFilter} options={categoryOptions} onChange={(value) => { setCategoryFilter(value); resetPage(); }} searchable />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2" aria-label="Khoảng ngày">
              {QUICK_RANGES.map((range) => (
                <Button key={range.id} type="button" size="sm" variant={dateRange === range.id ? 'primary' : 'outline'} aria-pressed={dateRange === range.id} onClick={() => selectQuickRange(range.id)}>
                  {range.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="tx-date-from" className="label">Từ ngày</label>
                <input id="tx-date-from" type="date" value={dateBounds.from} onChange={(event) => updateDateBound('from', event.target.value)} className="field" />
              </div>
              <div>
                <label htmlFor="tx-date-to" className="label">Đến ngày</label>
                <input id="tx-date-to" type="date" value={dateBounds.to} onChange={(event) => updateDateBound('to', event.target.value)} className="field" />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
