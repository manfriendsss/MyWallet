import React, { useState, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  subMonths,
} from 'date-fns';
import { useWallet } from '../../context/WalletContext';
import { Card, CardHeader } from '../ui/Card';
import { IconRenderer } from '../ui/IconRenderer';
import { ColorTile } from '../ui/Swatches';
import { formatCurrency, formatShortDate, formatSigned } from '../../utils/formatters';
import { CARD_ART } from '../../assets/cards';
import { ToneTabs, type ToneTab } from '../ui/ToneTabs';
import { Stagger, StaggerItem } from '../ui/Stagger';
import { Modal } from '../ui/Modal';
import { TransactionRow } from '../dashboard/TransactionRow';
import { TransactionDetailSheet } from '../transactions/TransactionDetailSheet';
import { TransactionFormModal } from '../transactions/TransactionForm';
import type { Category, Transaction } from '../../types';

type TimeRange = 'day' | 'week' | 'month' | 'year';

const RANGE_LABELS: Record<TimeRange, string> = {
  day: 'Hôm nay',
  week: 'Tuần',
  month: 'Tháng',
  year: 'Năm',
};

const RANGE_TABS: Array<ToneTab<TimeRange>> = (Object.keys(RANGE_LABELS) as TimeRange[]).map((id) => ({
  id,
  label: RANGE_LABELS[id],
  tone: 'accent',
}));

interface BreakdownItem {
  id: string;
  name: string;
  icon: string;
  color?: string;
  amount: number;
  share: number;
  percentage: number;
}

interface BreakdownCardProps {
  id: string;
  title: string;
  art: string;
  emptyText: string;
  shareLabel: string;
  items: BreakdownItem[];
  onSelect: (item: BreakdownItem) => void;
}

/** Totals per category for one direction (expense by category, income by source), largest first */
function buildBreakdown(
  list: Transaction[],
  categories: Category[],
  type: 'income' | 'expense',
  total: number,
  fallbackName: string
): BreakdownItem[] {
  const amounts: Record<string, number> = {};
  for (const tx of list) {
    if (tx.type === type) amounts[tx.categoryId] = (amounts[tx.categoryId] || 0) + tx.amountVnd;
  }

  return Object.entries(amounts)
    .map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId);
      const share = total > 0 ? amount / total : 0;
      return {
        id: catId,
        name: cat?.name || fallbackName,
        icon: cat?.icon || 'CircleDot',
        color: cat?.color,
        amount,
        share,
        percentage: Math.round(share * 100),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

/** A ranked list of categories with share bars; each row opens its transactions */
const BreakdownCard: React.FC<BreakdownCardProps> = ({ id, title, art, emptyText, shareLabel, items, onSelect }) => (
  <Card aria-labelledby={id}>
    <CardHeader id={id} title={title} art={art} />

    {items.length === 0 ? (
      <p className="border-t border-rule py-12 text-center text-sm text-muted">{emptyText}</p>
    ) : (
      <ul className="divide-y divide-rule border-t border-rule">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              aria-label={`${item.name}: ${formatCurrency(item.amount, 'VND')}, ${item.percentage}% ${shareLabel}. Xem giao dịch`}
              className="-mx-2 block w-[calc(100%+1rem)] rounded-control px-2 py-3 text-left transition-colors hover:bg-paper-2 active:bg-paper-3"
            >
              <div className="flex items-center gap-3">
                <ColorTile color={item.color} size="sm">
                  <IconRenderer name={item.icon} className="w-3.5 h-3.5" />
                </ColorTile>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.name}</span>
                <span className="figure w-10 text-right text-sm text-muted">{item.percentage}%</span>
                <span className="figure min-w-[6.5rem] text-right text-sm font-bold text-ink">
                  {formatCurrency(item.amount, 'VND')}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              </div>

              {/* Share bar: scaled, never width-animated */}
              <div className="mt-2 ml-10 mr-7 h-1.5 overflow-hidden rounded-full bg-paper-3" aria-hidden="true">
                <div
                  className="h-full w-full origin-left rounded-full transition-transform duration-300"
                  style={{ transform: `scaleX(${item.share})`, backgroundColor: item.color || 'var(--color-muted)' }}
                />
              </div>
            </button>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

interface MonthlyTrend {
  key: string;
  label: string;
  income: number;
  expense: number;
}

const CHART_WIDTH = 600;
const CHART_HEIGHT = 180;
const CHART_BASELINE = 132;
const CHART_MAX_BAR_HEIGHT = 96;
const CHART_LEFT = 30;
const CHART_SLOT_WIDTH = 90;
const CHART_BAR_WIDTH = 20;
const CHART_BAR_GAP = 6;

export const AnalyticsView: React.FC = () => {
  const { transactions, categories, wallets } = useWallet();
  const [range, setRange] = useState<TimeRange>('month');
  const [drawer, setDrawer] = useState<{ type: 'income' | 'expense'; item: BreakdownItem } | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const selectedTransaction = transactions.find((tx) => tx.id === selectedTransactionId);
  const [selectedTrendMonth, setSelectedTrendMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      try {
        const txDate = parseISO(tx.date);
        if (range === 'day') {
          return tx.date === format(now, 'yyyy-MM-dd');
        }
        if (range === 'week') {
          return isWithinInterval(txDate, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) });
        }
        if (range === 'month') {
          return isWithinInterval(txDate, { start: startOfMonth(now), end: endOfMonth(now) });
        }
        if (range === 'year') {
          return isWithinInterval(txDate, { start: startOfYear(now), end: endOfYear(now) });
        }
        return true;
      } catch {
        return false;
      }
    });
  }, [transactions, range]);

  // Aggregate totals
  const totalIncome = filteredTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + tx.amountVnd, 0);

  const totalExpense = filteredTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + tx.amountVnd, 0);

  const netSavings = totalIncome - totalExpense;

  const monthlyTrend = useMemo(() => {
    const currentMonth = startOfMonth(new Date());
    const months: MonthlyTrend[] = Array.from({ length: 6 }, (_, index) => {
      const date = subMonths(currentMonth, 5 - index);
      return {
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MM/yy'),
        income: 0,
        expense: 0,
      };
    });
    const monthByKey = new Map(months.map((month) => [month.key, month]));

    for (const tx of transactions) {
      if (tx.type === 'transfer') continue;
      const month = monthByKey.get(tx.date.slice(0, 7));
      if (!month) continue;
      if (tx.type === 'income') month.income += tx.amountVnd;
      if (tx.type === 'expense') month.expense += tx.amountVnd;
    }

    return months;
  }, [transactions]);

  const highlightedTrendMonth =
    monthlyTrend.find((month) => month.key === selectedTrendMonth) ?? monthlyTrend[monthlyTrend.length - 1];
  const trendMaximum = Math.max(1, ...monthlyTrend.flatMap((month) => [month.income, month.expense]));
  const currentMonthExpense = monthlyTrend[monthlyTrend.length - 1]?.expense ?? 0;
  const previousMonthExpense = monthlyTrend[monthlyTrend.length - 2]?.expense ?? 0;
  const expenseChange = previousMonthExpense
    ? Math.round(((currentMonthExpense - previousMonthExpense) / previousMonthExpense) * 100)
    : null;
  const expenseChangeTone = expenseChange === null
    ? 'text-ink-2'
    : expenseChange > 0
      ? 'text-expense'
      : expenseChange < 0
        ? 'text-income'
        : 'text-ink-2';

  // Share of spending per category, and of income per source (income category)
  const categoryBreakdown = useMemo(
    () => buildBreakdown(filteredTransactions, categories, 'expense', totalExpense, 'Chi khác'),
    [filteredTransactions, categories, totalExpense]
  );
  const incomeBreakdown = useMemo(
    () => buildBreakdown(filteredTransactions, categories, 'income', totalIncome, 'Thu khác'),
    [filteredTransactions, categories, totalIncome]
  );

  // The drawer's entries: this period, this category, newest first, grouped by day
  const drawerGroups = useMemo(() => {
    if (!drawer) return [];
    const groups: Array<{ date: string; transactions: Transaction[]; total: number }> = [];
    const list = filteredTransactions
      .filter((tx) => tx.type === drawer.type && tx.categoryId === drawer.item.id)
      .toSorted(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (b.time ?? '').localeCompare(a.time ?? '') ||
          b.createdAt.localeCompare(a.createdAt)
      );
    for (const tx of list) {
      const date = tx.date.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last?.date === date) {
        last.transactions.push(tx);
        last.total += tx.amountVnd;
      } else {
        groups.push({ date, transactions: [tx], total: tx.amountVnd });
      }
    }
    return groups;
  }, [drawer, filteredTransactions]);
  const drawerCount = drawerGroups.reduce((sum, group) => sum + group.transactions.length, 0);
  const drawerTotal = drawerGroups.reduce((sum, group) => sum + group.total, 0);
  const drawerSign = drawer?.type === 'income' ? '+' : '−';
  const drawerTone = drawer?.type === 'income' ? 'text-income' : 'text-expense';

  const stats = [
    { label: 'Tổng thu', value: formatSigned(totalIncome, 'VND', '+'), tone: 'text-income' },
    { label: 'Tổng chi', value: formatSigned(totalExpense, 'VND', '−'), tone: 'text-expense' },
    {
      label: 'Chênh lệch',
      value: formatSigned(netSavings, 'VND', netSavings > 0 ? '+' : '−'),
      tone: netSavings >= 0 ? 'text-ink' : 'text-warn',
    },
  ];

  return (
    <Stagger className="space-y-6">
      {/* Range Selector */}
      <StaggerItem>
        <ToneTabs tabs={RANGE_TABS} value={range} onChange={setRange} label="Khoảng thời gian" />
      </StaggerItem>

      {/* Summary row */}
      <StaggerItem>
        <Card as="div" className="p-0 sm:p-0">
          <dl className="grid grid-cols-2 sm:grid-cols-3">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`relative overflow-hidden p-4 sm:p-5 ${i === 1 ? 'border-l border-rule' : ''} ${i === 2 ? 'col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-rule' : ''}`}
              >
                {i === 2 && (
                  <img
                    src={CARD_ART.chart}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    className="card-art -bottom-3 right-2 w-24 opacity-25 dark:opacity-20"
                  />
                )}
                <dt className="relative text-sm text-muted">{stat.label}</dt>
                <dd className={`figure relative mt-1 text-lg sm:text-2xl font-bold ${stat.tone}`}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card aria-labelledby="trend-heading">
          <CardHeader id="trend-heading" title="Xu hướng 6 tháng" />

          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-control bg-paper-2 p-3">
              <dt className="text-sm text-muted">Thu {highlightedTrendMonth.label}</dt>
              <dd className="figure mt-1 font-bold text-income">
                {formatCurrency(highlightedTrendMonth.income, 'VND')}
              </dd>
            </div>
            <div className="rounded-control bg-paper-2 p-3">
              <dt className="text-sm text-muted">Chi {highlightedTrendMonth.label}</dt>
              <dd className="figure mt-1 font-bold text-expense">
                {formatCurrency(highlightedTrendMonth.expense, 'VND')}
              </dd>
            </div>
          </dl>

          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="mt-3 h-auto w-full"
            role="group"
            aria-labelledby="trend-chart-title"
          >
            <title id="trend-chart-title">Thu và chi trong 6 tháng gần nhất</title>
            <line
              x1={CHART_LEFT}
              x2={CHART_WIDTH - CHART_LEFT}
              y1={CHART_BASELINE}
              y2={CHART_BASELINE}
              style={{ stroke: 'var(--color-rule)' }}
            />

            {monthlyTrend.map((month, index) => {
              const slotX = CHART_LEFT + index * CHART_SLOT_WIDTH;
              const centerX = slotX + CHART_SLOT_WIDTH / 2;
              const incomeHeight = (month.income / trendMaximum) * CHART_MAX_BAR_HEIGHT;
              const expenseHeight = (month.expense / trendMaximum) * CHART_MAX_BAR_HEIGHT;
              const isSelected = month.key === highlightedTrendMonth.key;

              return (
                <g
                  key={month.key}
                  role="button"
                  tabIndex={0}
                  aria-label={`${month.label}: thu ${formatCurrency(month.income, 'VND')}, chi ${formatCurrency(month.expense, 'VND')}`}
                  className="cursor-pointer"
                  onMouseEnter={() => setSelectedTrendMonth(month.key)}
                  onFocus={() => setSelectedTrendMonth(month.key)}
                  onClick={() => setSelectedTrendMonth(month.key)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedTrendMonth(month.key);
                    }
                  }}
                >
                  <rect
                    x={slotX + 3}
                    y={8}
                    width={CHART_SLOT_WIDTH - 6}
                    height={148}
                    rx={8}
                    className="transition-opacity"
                    style={{ fill: 'var(--color-paper-3)', opacity: isSelected ? 1 : 0 }}
                  />
                  <rect
                    x={centerX - CHART_BAR_GAP / 2 - CHART_BAR_WIDTH}
                    y={CHART_BASELINE - incomeHeight}
                    width={CHART_BAR_WIDTH}
                    height={incomeHeight}
                    rx={3}
                    className="transition-opacity"
                    style={{ fill: 'var(--color-income)', opacity: isSelected ? 1 : 0.55 }}
                  />
                  <rect
                    x={centerX + CHART_BAR_GAP / 2}
                    y={CHART_BASELINE - expenseHeight}
                    width={CHART_BAR_WIDTH}
                    height={expenseHeight}
                    rx={3}
                    className="transition-opacity"
                    style={{ fill: 'var(--color-expense)', opacity: isSelected ? 1 : 0.55 }}
                  />
                  <text
                    x={centerX}
                    y={154}
                    textAnchor="middle"
                    className={`fill-current text-[11px] text-muted ${isSelected ? 'font-semibold' : ''}`}
                  >
                    {month.label}
                  </text>
                </g>
              );
            })}
          </svg>

          <p className="border-t border-rule pt-3 text-sm text-muted">
            Chi tháng này so với tháng trước:{' '}
            {expenseChange === null ? (
              <span className={expenseChangeTone}>Chưa có dữ liệu tháng trước</span>
            ) : (
              <span className={`figure font-semibold ${expenseChangeTone}`}>
                {expenseChange > 0 ? '+' : expenseChange < 0 ? '−' : ''}{Math.abs(expenseChange)}%
              </span>
            )}
          </p>
        </Card>
      </StaggerItem>

      {/* Category breakdown */}
      <StaggerItem>
        <BreakdownCard
          id="breakdown-heading"
          title="Chi tiêu theo danh mục"
          art={CARD_ART.chart}
          emptyText="Chưa có khoản chi nào trong khoảng thời gian này."
          shareLabel="tổng chi"
          items={categoryBreakdown}
          onSelect={(item) => setDrawer({ type: 'expense', item })}
        />
      </StaggerItem>

      {/* Income by source */}
      <StaggerItem>
        <BreakdownCard
          id="income-breakdown-heading"
          title="Thu nhập theo nguồn"
          art={CARD_ART.income}
          emptyText="Chưa có khoản thu nào trong khoảng thời gian này."
          shareLabel="tổng thu"
          items={incomeBreakdown}
          onSelect={(item) => setDrawer({ type: 'income', item })}
        />
      </StaggerItem>

      {/* Drawer: the transactions behind one category or income source */}
      <Modal
        variant="drawer"
        maxWidth="sm:max-w-md"
        isOpen={Boolean(drawer)}
        onClose={() => setDrawer(null)}
        title={drawer?.item.name}
        description={drawer ? `${RANGE_LABELS[range]} · ${drawerCount} giao dịch` : undefined}
      >
        {drawerGroups.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Không còn giao dịch nào trong mục này.</p>
        ) : (
          <div className="-mx-5 -mt-5 sm:-mx-6">
            <div className="flex items-baseline justify-between gap-3 px-5 py-4 sm:px-6">
              <span className="text-sm text-muted">Tổng cộng</span>
              <span className={`figure text-xl font-bold ${drawerTone}`}>{formatSigned(drawerTotal, 'VND', drawerSign)}</span>
            </div>
            {drawerGroups.map((group) => (
              <section key={group.date}>
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-y border-rule bg-surface/95 px-5 py-2 backdrop-blur sm:px-6">
                  <h3 className="text-sm font-semibold text-ink">{formatShortDate(group.date)}</h3>
                  <span className={`figure text-sm ${drawerTone}`}>{formatSigned(group.total, 'VND', drawerSign)}</span>
                </div>
                <ul className="divide-y divide-rule px-5 sm:px-6">
                  {group.transactions.map((tx, index) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      index={index}
                      category={categories.find((c) => c.id === tx.categoryId)}
                      wallet={wallets.find((w) => w.id === tx.walletId)}
                      showDate={false}
                      onOpen={(transaction) => setSelectedTransactionId(transaction.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Modal>
      <TransactionDetailSheet
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransactionId(null)}
        onEdit={() => {
          if (!selectedTransaction) return;
          setSelectedTransactionId(null);
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => setEditing(selectedTransaction));
          });
        }}
        transaction={selectedTransaction}
        category={selectedTransaction ? categories.find((c) => c.id === selectedTransaction.categoryId) : undefined}
        wallet={selectedTransaction ? wallets.find((w) => w.id === selectedTransaction.walletId) : undefined}
        toWallet={selectedTransaction?.toWalletId ? wallets.find((w) => w.id === selectedTransaction.toWalletId) : undefined}
      />
      <TransactionFormModal isOpen={Boolean(editing)} onClose={() => setEditing(null)} transaction={editing ?? undefined} />
    </Stagger>
  );
};
