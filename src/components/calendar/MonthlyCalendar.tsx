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
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ToneTabs, type ToneTab } from '../ui/ToneTabs';
import { useToast } from '../ui/Toast';
import { TransactionRow } from '../dashboard/TransactionRow';
import { formatDate, formatShortDate, formatSigned } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { CARD_ART } from '../../assets/cards';
import { Stagger, StaggerItem } from '../ui/Stagger';
import type { EntryType, Transaction } from '../../types';
import { TransactionDetailSheet } from '../transactions/TransactionDetailSheet';
import { TransactionFormModal } from '../transactions/TransactionForm';

type TypeFilter = 'all' | EntryType;

const TYPE_TABS: Array<ToneTab<TypeFilter>> = [
  { id: 'all', label: 'Tất cả', tone: 'accent' },
  { id: 'income', label: 'Thu', tone: 'income' },
  { id: 'expense', label: 'Chi', tone: 'expense' },
  { id: 'transfer', label: 'Chuyển', tone: 'accent' },
];

export const MonthlyCalendar: React.FC = () => {
  const { transactions, categories, wallets, openAssistant, deleteTransaction, restoreTransactions } = useWallet();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState<number>(0);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const selectedTransaction = transactions.find((transaction) => transaction.id === selectedTransactionId);

  const prevMonth = () => {
    setDirection(-1);
    setSelectedDay(null);
    setCurrentDate((d) => subMonths(d, 1));
  };

  const nextMonth = () => {
    setDirection(1);
    setSelectedDay(null);
    setCurrentDate((d) => addMonths(d, 1));
  };

  const goToday = () => {
    setDirection(0);
    setSelectedDay(null);
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

  // The month's entries, newest first; a tapped day narrows the list to that day
  const selectedDayKey = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null;
  const monthTransactions = transactions
    .filter((tx) => tx.date.startsWith(monthKey) && (!selectedDayKey || tx.date.slice(0, 10) === selectedDayKey))
    .toSorted(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.time ?? '').localeCompare(a.time ?? '') ||
        b.createdAt.localeCompare(a.createdAt)
    );
  const listTransactions = typeFilter === 'all'
    ? monthTransactions
    : monthTransactions.filter((tx) => tx.type === typeFilter);

  const groups: Array<{ date: string; transactions: Transaction[]; net: number }> = [];
  for (const tx of listTransactions) {
    const date = tx.date.slice(0, 10);
    const net = tx.type === 'income' ? tx.amountVnd : tx.type === 'expense' ? -tx.amountVnd : 0;
    const last = groups[groups.length - 1];
    if (last?.date === date) {
      last.transactions.push(tx);
      last.net += net;
    } else {
      groups.push({ date, transactions: [tx], net });
    }
  }

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

      {/* Compact calendar: a glance at which days had money moving, tap a day to narrow the list */}
      <StaggerItem>
      <Card className="relative z-[1] p-2 sm:p-3 overflow-hidden">
        <div className="grid grid-cols-7 text-center" aria-hidden="true">
          {weekDayHeaders.map((dayName) => (
            <div key={dayName} className="pb-1 text-[11px] font-semibold text-muted">
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
            className="grid grid-cols-7 gap-0.5 sm:gap-1"
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
                  disabled={!isCurrentMonth}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  aria-label={label}
                  aria-pressed={Boolean(isSelected)}
                  aria-current={isCurrentDay ? 'date' : undefined}
                  className={cn(
                    'flex h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-control border transition-colors sm:h-14',
                    isSelected
                      ? 'border-accent bg-accent-soft'
                      : isCurrentMonth
                        ? 'border-transparent hover:bg-paper-2'
                        : 'border-transparent text-muted opacity-40'
                  )}
                >
                  <span
                    className={cn(
                      'figure grid h-6 w-6 place-items-center rounded-full text-xs font-semibold sm:text-sm',
                      isCurrentDay ? 'bg-accent text-accent-ink' : isCurrentMonth ? 'text-ink' : 'text-muted'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <span className="flex h-1.5 gap-1" aria-hidden="true">
                    {isCurrentMonth && dayData?.incomeVnd > 0 && <span className="h-1.5 w-1.5 rounded-full bg-income" />}
                    {isCurrentMonth && dayData?.expenseVnd > 0 && <span className="h-1.5 w-1.5 rounded-full bg-expense" />}
                  </span>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </Card>
      </StaggerItem>

      {/* The month's transactions, like "Xem tất cả" but scoped to the month shown */}
      <StaggerItem>
      <div className="relative z-[1] space-y-3">
        <ToneTabs tabs={TYPE_TABS} value={typeFilter} onChange={setTypeFilter} label="Lọc nhanh loại giao dịch" />

        <div className="flex min-h-10 items-center justify-between gap-3 px-1">
          <h2 className="text-base text-ink">
            Giao dịch
            <span className="ml-1.5 text-sm font-normal text-muted">({listTransactions.length})</span>
          </h2>
          {selectedDay && (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent"
              aria-label={`Bỏ lọc ngày ${formatDate(selectedDay)}`}
            >
              Ngày {format(selectedDay, 'dd/MM')}
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        <Card className="overflow-clip p-0 sm:p-0">
          {groups.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted">
                {selectedDay ? 'Ngày này chưa phát sinh giao dịch phù hợp.' : 'Tháng này chưa có giao dịch phù hợp.'}
              </p>
              <Button variant="primary" className="mt-4" onClick={() => openAssistant()}>
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Thêm giao dịch</span>
              </Button>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.date}>
                <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 flex items-center justify-between gap-3 border-y border-rule bg-paper/90 px-4 py-2 backdrop-blur sm:px-5">
                  <h3 className="text-sm font-semibold text-ink">{formatShortDate(group.date)}</h3>
                  <span className="figure text-sm text-muted">
                    {formatSigned(Math.abs(group.net), 'VND', group.net >= 0 ? '+' : '−')}
                  </span>
                </div>
                <ul className="divide-y divide-rule px-4 sm:px-5">
                  {group.transactions.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      category={categories.find((c) => c.id === tx.categoryId)}
                      wallet={wallets.find((w) => w.id === tx.walletId)}
                      toWallet={tx.toWalletId ? wallets.find((w) => w.id === tx.toWalletId) : undefined}
                      showDate={false}
                      onEdit={setEditing}
                      onOpen={(transaction) => setSelectedTransactionId(transaction.id)}
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
            ))
          )}
        </Card>
      </div>
      </StaggerItem>
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
