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
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TransactionRow } from '../dashboard/TransactionRow';
import { formatCurrency, formatDate, formatSigned } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { CARD_ART } from '../../assets/cards';
import { Stagger, StaggerItem } from '../ui/Stagger';
import type { Transaction } from '../../types';
import { TransactionDetailSheet } from '../transactions/TransactionDetailSheet';
import { TransactionFormModal } from '../transactions/TransactionForm';

export const MonthlyCalendar: React.FC = () => {
  const { transactions, categories, wallets, openAssistant } = useWallet();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const selectedTransaction = transactions.find((transaction) => transaction.id === selectedTransactionId);

  const prevMonth = () => {
    setDirection(-1);
    setCurrentDate((d) => subMonths(d, 1));
  };

  const nextMonth = () => {
    setDirection(1);
    setCurrentDate((d) => addMonths(d, 1));
  };

  const goToday = () => {
    setDirection(0);
    setCurrentDate(new Date());
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
    // Transfers (paying a card) are neither income nor spending
    if (tx.type === 'income') {
      transactionsByDate[tx.date].incomeVnd += tx.amountVnd;
    } else if (tx.type === 'expense') {
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
      else if (tx.type === 'expense') monthTotalExpense += tx.amountVnd;
    }
  }

  const selectedDayTransactions = selectedDay
    ? transactions.filter((tx) => tx.date === format(selectedDay, 'yyyy-MM-dd'))
    : [];

  const weekDayHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const isCurrentMonthView = isSameMonth(currentDate, new Date());

  return (
    <Stagger className="relative space-y-6">
      {/* Large, faded calendar art resting in the top-right corner, behind every word */}
      <img
        src={CARD_ART.calendar}
        alt=""
        aria-hidden="true"
        decoding="async"
        width={176}
        height={176}
        className="pointer-events-none absolute -right-2 -top-6 z-0 w-32 sm:-right-4 sm:-top-10 sm:w-44 select-none object-contain opacity-15 dark:opacity-10"
      />

      {/* Month selector & totals */}
      <StaggerItem>
      <div className="relative z-[1] space-y-4">
        {/* Month: arrows at the edges, the month centred between them */}
        <div className="flex w-full items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Tháng trước"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-rule-strong bg-surface text-ink hover:bg-paper-2 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <h2 aria-live="polite" className="figure text-center text-xl text-ink">
              Tháng {format(currentDate, 'MM/yyyy')}
            </h2>
            {!isCurrentMonthView && (
              <button type="button" onClick={goToday} className="mt-0.5 text-xs font-semibold text-accent hover:underline">
                Về tháng này
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Tháng sau"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-control border border-rule-strong bg-surface text-ink hover:bg-paper-2 transition-colors"
          >
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* This month's in and out, half the width each */}
        <dl className="grid grid-cols-2 overflow-hidden rounded-control border border-rule bg-surface">
          <div className="px-4 py-3 text-center">
            <dt className="text-sm text-muted">Thu</dt>
            <dd className="figure text-lg font-bold text-income">{formatSigned(monthTotalIncome, 'VND', '+')}</dd>
          </div>
          <div className="border-l border-rule px-4 py-3 text-center">
            <dt className="text-sm text-muted">Chi</dt>
            <dd className="figure text-lg font-bold text-expense">{formatSigned(monthTotalExpense, 'VND', '−')}</dd>
          </div>
        </dl>
      </div>
      </StaggerItem>

      {/* Calendar Grid */}
      <StaggerItem>
      <Card className="relative z-[1] p-2 sm:p-4 overflow-hidden">
        <div className="grid grid-cols-7 text-center" aria-hidden="true">
          {weekDayHeaders.map((dayName) => (
            <div key={dayName} className="py-2 text-xs font-semibold text-muted">
              {dayName}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={monthKey}
            custom={direction}
            initial={{ opacity: 0, x: direction * 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 16 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-7 gap-1 sm:gap-1.5"
          >
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const dayData = transactionsByDate[dateStr];
              const label = `${formatDate(day)}${
                dayData?.count ? `, ${dayData.count} giao dịch` : ''
              }`;

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  aria-label={label}
                  aria-current={isCurrentDay ? 'date' : undefined}
                  className={cn(
                    'min-h-[64px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-control border text-left flex flex-col justify-between transition-colors min-w-0',
                    isSelected
                      ? 'border-accent bg-accent-soft'
                      : isCurrentMonth
                        ? 'border-rule bg-surface hover:border-rule-strong hover:bg-paper-2'
                        : 'border-transparent bg-paper-2 text-muted'
                  )}
                >
                  <span
                    className={cn(
                      'figure grid h-6 w-6 place-items-center rounded-full text-xs sm:text-sm font-semibold',
                      isCurrentDay ? 'bg-accent text-accent-ink' : isCurrentMonth ? 'text-ink' : 'text-muted'
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  {dayData && (
                    <>
                      {/* Phone cells are too narrow for full amounts: a mark per direction, the amounts open on tap */}
                      <span className="mt-1 flex w-full justify-center gap-2 sm:hidden" aria-hidden="true">
                        {dayData.incomeVnd > 0 && <span className="h-1.5 w-1.5 rounded-full bg-income" />}
                        {dayData.expenseVnd > 0 && <span className="h-1.5 w-1.5 rounded-full bg-expense" />}
                      </span>
                      <span className="figure mt-1 hidden space-y-0.5 text-xs font-semibold leading-tight sm:block">
                        {dayData.incomeVnd > 0 && (
                          <span className="block truncate text-income">+{formatCurrency(dayData.incomeVnd, 'VND')}</span>
                        )}
                        {dayData.expenseVnd > 0 && (
                          <span className="block truncate text-expense">−{formatCurrency(dayData.expenseVnd, 'VND')}</span>
                        )}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </Card>
      </StaggerItem>

      {/* Modal: Chi tiết giao dịch ngày được bấm */}
      <Modal
        isOpen={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `Giao dịch ngày ${formatDate(selectedDay)}` : ''}
        description={
          selectedDayTransactions.length > 0
            ? `${selectedDayTransactions.length} giao dịch`
            : 'Chưa có giao dịch nào trong ngày này'
        }
      >
        {selectedDayTransactions.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted">Ngày này chưa phát sinh thu chi.</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => {
                openAssistant();
              }}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Thêm giao dịch</span>
            </Button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-rule -mt-3">
              {selectedDayTransactions.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  tx={tx}
                  category={categories.find((c) => c.id === tx.categoryId)}
                  wallet={wallets.find((w) => w.id === tx.walletId)}
                  toWallet={tx.toWalletId ? wallets.find((w) => w.id === tx.toWalletId) : undefined}
                  showDate={false}
                  onOpen={(transaction) => setSelectedTransactionId(transaction.id)}
                />
              ))}
            </ul>
            {(
              <p className="figure mt-3 border-t border-rule pt-3 text-right text-sm text-muted">
                Tổng trong ngày:{' '}
                <span className="font-bold text-ink">
                  {formatCurrency(
                    selectedDayTransactions.reduce(
                      (sum, tx) => sum + (tx.type === 'income' ? tx.amountVnd : tx.type === 'expense' ? -tx.amountVnd : 0),
                      0
                    ),
                    'VND'
                  )}
                </span>
              </p>
            )}
          </>
        )}
      </Modal>
      <TransactionDetailSheet
        isOpen={Boolean(selectedTransaction)}
        onClose={() => setSelectedTransactionId(null)}
        onEdit={() => {
          if (!selectedTransaction) return;
          setEditing(selectedTransaction);
          setSelectedTransactionId(null);
        }}
        transaction={selectedTransaction}
        category={selectedTransaction ? categories.find((category) => category.id === selectedTransaction.categoryId) : undefined}
        wallet={selectedTransaction ? wallets.find((wallet) => wallet.id === selectedTransaction.walletId) : undefined}
        toWallet={selectedTransaction?.toWalletId ? wallets.find((wallet) => wallet.id === selectedTransaction.toWalletId) : undefined}
      />
      <TransactionFormModal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        transaction={editing ?? undefined}
      />
    </Stagger>
  );
};
