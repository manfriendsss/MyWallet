import React, { useState, useMemo } from 'react';
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
} from 'date-fns';
import { useWallet } from '../../context/WalletContext';
import { Card, CardHeader } from '../ui/Card';
import { IconRenderer } from '../ui/IconRenderer';
import { ColorTile } from '../ui/Swatches';
import { formatCurrency } from '../../utils/formatters';
import { CARD_ART } from '../../assets/cards';

type TimeRange = 'day' | 'week' | 'month' | 'year';

const RANGE_LABELS: Record<TimeRange, string> = {
  day: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  year: 'Năm nay',
};

export const AnalyticsView: React.FC = () => {
  const { transactions, categories } = useWallet();
  const [range, setRange] = useState<TimeRange>('month');

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

  // Breakdown by Category for Expenses
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, number> = {};
    for (const tx of filteredTransactions) {
      if (tx.type === 'expense') {
        catMap[tx.categoryId] = (catMap[tx.categoryId] || 0) + tx.amountVnd;
      }
    }

    const items = Object.entries(catMap).map(([catId, amount]) => {
      const cat = categories.find((c) => c.id === catId);
      const share = totalExpense > 0 ? amount / totalExpense : 0;
      return {
        id: catId,
        name: cat?.name || 'Chi khác',
        icon: cat?.icon || 'CircleDot',
        color: cat?.color,
        amount,
        share,
        percentage: Math.round(share * 100),
      };
    });

    return items.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories, totalExpense]);

  const stats = [
    { label: 'Tổng thu', value: `+${formatCurrency(totalIncome, 'VND')}`, tone: 'text-income' },
    { label: 'Tổng chi', value: `−${formatCurrency(totalExpense, 'VND')}`, tone: 'text-expense' },
    {
      label: 'Chênh lệch',
      value: `${netSavings >= 0 ? '+' : ''}${formatCurrency(netSavings, 'VND')}`,
      tone: netSavings >= 0 ? 'text-ink' : 'text-warn',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Range Selector */}
      <div className="flex">
        <div className="seg w-full sm:w-auto overflow-x-auto no-scrollbar [&>button]:flex-1" role="group" aria-label="Khoảng thời gian">
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
            <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary row */}
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

      {/* Category breakdown */}
      <Card aria-labelledby="breakdown-heading">
        <CardHeader
          id="breakdown-heading"
          title="Chi tiêu theo danh mục"
          art={CARD_ART.chart}
          description={
            categoryBreakdown[0]
              ? `Nhiều nhất: ${categoryBreakdown[0].name}, ${categoryBreakdown[0].percentage}% tổng chi`
              : `${RANGE_LABELS[range]}`
          }
        />

        {categoryBreakdown.length === 0 ? (
          <p className="border-t border-rule py-12 text-center text-sm text-muted">
            Chưa có khoản chi nào trong khoảng thời gian này.
          </p>
        ) : (
          <ul className="divide-y divide-rule border-t border-rule">
            {categoryBreakdown.map((item) => (
              <li key={item.id} className="py-3">
                <div className="flex items-center gap-3">
                  <ColorTile color={item.color} size="sm">
                    <IconRenderer name={item.icon} className="w-3.5 h-3.5" />
                  </ColorTile>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.name}</span>
                  <span className="figure w-10 text-right text-sm text-muted">{item.percentage}%</span>
                  <span className="figure min-w-[6.5rem] text-right text-sm font-bold text-ink">
                    {formatCurrency(item.amount, 'VND')}
                  </span>
                </div>

                {/* Share bar: scaled, never width-animated */}
                <div
                  className="mt-2 ml-10 h-1.5 overflow-hidden rounded-full bg-paper-3"
                  role="img"
                  aria-label={`${item.name}: ${item.percentage}% tổng chi`}
                >
                  <div
                    className="h-full w-full origin-left rounded-full transition-transform duration-300"
                    style={{ transform: `scaleX(${item.share})`, backgroundColor: item.color || 'var(--color-muted)' }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
