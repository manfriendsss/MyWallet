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
import { TrendingUp, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card } from '../ui/Card';
import { IconRenderer } from '../ui/IconRenderer';
import { formatCurrency } from '../../utils/formatters';

type TimeRange = 'day' | 'week' | 'month' | 'year';

export const AnalyticsView: React.FC = () => {
  const { transactions, categories, isBalanceHidden } = useWallet();
  const [range, setRange] = useState<TimeRange>('month');

  // Filter transactions based on selected range
  const now = new Date();

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      try {
        const txDate = parseISO(tx.date);
        if (range === 'day') {
          return tx.date === format(now, 'yyyy-MM-dd');
        }
        if (range === 'week') {
          const start = startOfWeek(now, { weekStartsOn: 1 });
          const end = endOfWeek(now, { weekStartsOn: 1 });
          return isWithinInterval(txDate, { start, end });
        }
        if (range === 'month') {
          const start = startOfMonth(now);
          const end = endOfMonth(now);
          return isWithinInterval(txDate, { start, end });
        }
        if (range === 'year') {
          const start = startOfYear(now);
          const end = endOfYear(now);
          return isWithinInterval(txDate, { start, end });
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
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        id: catId,
        name: cat?.name || 'Chi khác',
        icon: cat?.icon || 'CircleDot',
        color: cat?.color || '#64748b',
        amount,
        percentage,
      };
    });

    // Sort descending by amount
    return items.sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, categories, totalExpense]);

  const topCategory = categoryBreakdown[0];

  return (
    <div className="space-y-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white">
            Thống Kê Chi Tiêu
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            Phân tích tỷ trọng và xu hướng dòng tiền
          </p>
        </div>

        {/* 4 Tabs: Ngày / Tuần / Tháng / Năm */}
        <div className="flex items-center bg-neutral-200/80 dark:bg-neutral-900 p-1 rounded-2xl self-start sm:self-auto">
          {(['day', 'week', 'month', 'year'] as TimeRange[]).map((r) => {
            const labels: Record<TimeRange, string> = {
              day: 'Hôm nay',
              week: 'Tuần này',
              month: 'Tháng này',
              year: 'Năm nay',
            };
            const isActive = range === r;
            return (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm font-bold'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Thu nhập */}
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Tổng Thu Nhập</span>
            <p className="text-lg sm:text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {isBalanceHidden ? '••••••' : `+${formatCurrency(totalIncome, 'VND')}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </Card>

        {/* Chi tiêu */}
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Tổng Chi Tiêu</span>
            <p className="text-lg sm:text-2xl font-extrabold font-mono text-rose-600 dark:text-rose-400 mt-1">
              {isBalanceHidden ? '••••••' : `-${formatCurrency(totalExpense, 'VND')}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </Card>

        {/* Chênh lệch ròng */}
        <Card className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Thặng Dư Ròng</span>
            <p
              className={`text-lg sm:text-2xl font-extrabold font-mono mt-1 ${
                netSavings >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-500'
              }`}
            >
              {isBalanceHidden
                ? '••••••'
                : `${netSavings >= 0 ? '+' : ''}${formatCurrency(netSavings, 'VND')}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Highlight Top Category */}
      {topCategory && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: topCategory.color }}
            >
              <IconRenderer name={topCategory.icon} className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
                Mục Chi Tiêu Nhiều Nhất
              </span>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">
                {topCategory.name} &bull; {topCategory.percentage}% tổng chi
              </h3>
            </div>
          </div>
          <p className="text-lg font-extrabold font-mono text-neutral-900 dark:text-white">
            {isBalanceHidden ? '••••••' : formatCurrency(topCategory.amount, 'VND')}
          </p>
        </div>
      )}

      {/* Category Breakdown Progress Bars */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <PieChart className="w-5 h-5 text-purple-500" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Cơ Cấu Chi Tiêu Theo Danh Mục
            </h3>
          </div>
          <span className="text-xs text-neutral-400">{categoryBreakdown.length} danh mục</span>
        </div>

        {categoryBreakdown.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-sm">
            Chưa có chi tiêu nào trong khoảng thời gian này
          </div>
        ) : (
          <div className="space-y-4 pt-4">
            {categoryBreakdown.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-200">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-neutral-400">{item.percentage}%</span>
                    <span className="font-bold text-neutral-900 dark:text-white">
                      {isBalanceHidden ? '••••••' : formatCurrency(item.amount, 'VND')}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
