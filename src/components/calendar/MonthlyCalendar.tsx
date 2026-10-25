import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { IconRenderer } from '../ui/IconRenderer';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';

export const MonthlyCalendar: React.FC = () => {
  const { transactions, categories, wallets, openAssistant, isBalanceHidden } = useWallet();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const prevMonth = () => {
    setDirection(-1);
    setCurrentDate((d) => subMonths(d, 1));
  };

  const nextMonth = () => {
    setDirection(1);
    setCurrentDate((d) => addMonths(d, 1));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Map transactions by YYYY-MM-DD
  const transactionsByDate: Record<string, { incomeVnd: number; expenseVnd: number; count: number }> = {};
  for (const tx of transactions) {
    if (!transactionsByDate[tx.date]) {
      transactionsByDate[tx.date] = { incomeVnd: 0, expenseVnd: 0, count: 0 };
    }
    if (tx.type === 'income') {
      transactionsByDate[tx.date].incomeVnd += tx.amountVnd;
    } else {
      transactionsByDate[tx.date].expenseVnd += tx.amountVnd;
    }
    transactionsByDate[tx.date].count += 1;
  }

  // Monthly summary
  const monthKey = format(currentDate, 'yyyy-MM');
  let monthTotalIncome = 0;
  let monthTotalExpense = 0;
  for (const tx of transactions) {
    if (tx.date.startsWith(monthKey)) {
      if (tx.type === 'income') monthTotalIncome += tx.amountVnd;
      else monthTotalExpense += tx.amountVnd;
    }
  }

  const selectedDayTransactions = selectedDay
    ? transactions.filter((tx) => tx.date === format(selectedDay, 'yyyy-MM-dd'))
    : [];

  const weekDayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="space-y-5">
      {/* Top Banner: Month Selector & Quick Totals */}
      <Card className="p-4 sm:p-6 bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#121623] text-white border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <CalendarIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold capitalize text-white">
                {format(currentDate, 'MMMM, yyyy', { locale: vi })}
              </h2>
              <p className="text-xs text-neutral-400">
                Vuốt hoặc bấm mũi tên để xem các tháng khác
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end sm:self-auto">
            {/* Quick stats for this month */}
            <div className="flex items-center gap-3 text-xs sm:text-sm font-mono">
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block uppercase">Thu</span>
                <span className="text-emerald-400 font-bold">
                  {isBalanceHidden ? '••••••' : `+${formatCompactCurrency(monthTotalIncome, 'VND')}`}
                </span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block uppercase">Chi</span>
                <span className="text-rose-400 font-bold">
                  {isBalanceHidden ? '••••••' : `-${formatCompactCurrency(monthTotalExpense, 'VND')}`}
                </span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-neutral-300 hover:text-white cursor-pointer"
                title="Tháng trước"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-neutral-300 hover:text-white cursor-pointer"
                title="Tháng sau"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Calendar Grid with Slide Animation */}
      <Card className="p-3 sm:p-5 overflow-hidden">
        {/* Day of week headers */}
        <div className="grid grid-cols-7 mb-2 text-center">
          {weekDayHeaders.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-2 text-xs font-bold uppercase tracking-wider ${
                idx >= 5 ? 'text-amber-500/80 dark:text-amber-400/80' : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Days Grid animated with Framer Motion */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={monthKey}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 40 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-7 gap-1 sm:gap-2"
          >
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const dayData = transactionsByDate[dateStr];

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[70px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                    !isCurrentMonth
                      ? 'opacity-30 border-transparent bg-neutral-50/50 dark:bg-white/[0.01]'
                      : isSelected
                      ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/30'
                      : 'border-neutral-200/60 dark:border-white/5 bg-white/50 dark:bg-[#121623]/60 hover:border-neutral-300 dark:hover:border-white/20'
                  }`}
                >
                  {/* Top: Day number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                        isCurrentDay
                          ? 'bg-emerald-600 text-white font-bold'
                          : isCurrentMonth
                          ? 'text-neutral-800 dark:text-neutral-200'
                          : 'text-neutral-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayData && dayData.count > 0 && (
                      <span className="hidden sm:inline-block text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {dayData.count} gd
                      </span>
                    )}
                  </div>

                  {/* Bottom: Daily Income (+) and Expense (-) numbers directly on cell */}
                  <div className="space-y-0.5 mt-1 font-mono text-[10px] sm:text-xs">
                    {dayData?.incomeVnd ? (
                      <div className="text-emerald-600 dark:text-emerald-400 font-bold truncate leading-tight">
                        +{formatCompactCurrency(dayData.incomeVnd, 'VND')}
                      </div>
                    ) : null}
                    {dayData?.expenseVnd ? (
                      <div className="text-rose-600 dark:text-rose-400 font-bold truncate leading-tight">
                        -{formatCompactCurrency(dayData.expenseVnd, 'VND')}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Modal: Chi tiết giao dịch ngày được bấm */}
      <Modal
        isOpen={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `Giao dịch ngày ${format(selectedDay, 'dd/MM/yyyy')}` : ''}
        description={
          selectedDayTransactions.length > 0
            ? `${selectedDayTransactions.length} giao dịch đã ghi nhận`
            : 'Chưa có giao dịch nào trong ngày này'
        }
      >
        <div className="space-y-3">
          {selectedDayTransactions.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <CalendarIcon className="w-10 h-10 text-neutral-400 mb-2 stroke-[1.5]" />
              <p className="text-sm text-neutral-500">Ngày này bạn chưa phát sinh thu chi</p>
              <button
                onClick={() => {
                  setSelectedDay(null);
                  openAssistant();
                }}
                className="mt-4 flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Nói hoặc thêm chi tiêu bằng AI</span>
              </button>
            </div>
          ) : (
            selectedDayTransactions.map((tx) => {
              const cat = categories.find((c) => c.id === tx.categoryId);
              const wallet = wallets.find((w) => w.id === tx.walletId);
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                      style={{ backgroundColor: cat?.color || '#64748b' }}
                    >
                      <IconRenderer name={cat?.icon || 'CircleDot'} className="w-5 h-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {tx.note || cat?.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {wallet?.name} {tx.time ? `• ${tx.time}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-sm font-bold font-mono ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                    </p>
                    {tx.currency !== 'VND' && (
                      <p className="text-[11px] font-mono text-neutral-400">
                        ≈ {formatCurrency(tx.amountVnd, 'VND')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Modal>
    </div>
  );
};
