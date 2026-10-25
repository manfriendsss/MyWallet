import React from 'react';
import { useWallet } from '../../context/WalletContext';
import { formatCurrency } from '../../utils/formatters';
import { CARD_ART } from '../../assets/cards';
import { cn } from '../../utils/cn';

export const TotalBalanceCard: React.FC = () => {
  const { totalBalanceVnd, totalIncomeThisMonthVnd, totalExpenseThisMonthVnd } = useWallet();

  const netSavings = totalIncomeThisMonthVnd - totalExpenseThisMonthVnd;
  const savingsRate =
    totalIncomeThisMonthVnd > 0
      ? Math.round((netSavings / totalIncomeThisMonthVnd) * 100)
      : 0;

  const stats = [
    {
      label: 'Thu tháng này',
      value: `+${formatCurrency(totalIncomeThisMonthVnd, 'VND')}`,
      tone: 'text-income',
    },
    {
      label: 'Chi tháng này',
      value: `−${formatCurrency(totalExpenseThisMonthVnd, 'VND')}`,
      tone: 'text-expense',
    },
    {
      label: 'Dư ròng',
      value: `${netSavings >= 0 ? '+' : ''}${formatCurrency(netSavings, 'VND')}`,
      note: totalIncomeThisMonthVnd > 0 ? `${savingsRate}% thu nhập` : undefined,
      tone: netSavings >= 0 ? 'text-ink' : 'text-warn',
    },
  ];

  return (
    <section
      aria-labelledby="balance-heading"
      className="relative overflow-hidden rounded-card border border-rule bg-surface p-5 sm:p-7 shadow-[var(--shadow-card)]"
    >
      {/* Warm light behind the figure */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,var(--color-glow-1),transparent)]"
      />
      <img
        src={CARD_ART.balance}
        alt=""
        aria-hidden="true"
        decoding="async"
        className="card-art -right-3 -top-2 z-0 w-32 opacity-35 sm:right-4 sm:top-2 sm:w-44 lg:w-52 dark:opacity-25"
      />

      <div className="relative z-[1]">
        <h2 id="balance-heading" className="text-sm font-semibold text-muted">
          Tổng số dư
        </h2>

        {/* The signature: one figure, set big */}
        <p className="figure mt-2 whitespace-nowrap text-[length:var(--text-figure)] font-bold leading-none tracking-[-0.02em] text-ink">
          {formatCurrency(totalBalanceVnd, 'VND')}
        </p>

        {/* This month: in, out, net */}
        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-px overflow-hidden rounded-control bg-rule sm:max-w-[calc(100%-10rem)] lg:max-w-[calc(100%-12rem)]">
          {stats.map((stat, i) => (
            <div key={stat.label} className={cn('bg-paper-2 px-3 py-3 sm:px-4', i === 2 && 'col-span-2 sm:col-span-1')}>
              <dt className="text-xs sm:text-sm text-muted">{stat.label}</dt>
              <dd className={cn('figure mt-0.5 text-md sm:text-lg font-bold', stat.tone)}>
                {stat.value}
                {stat.note && <span className="ml-2 text-xs font-semibold text-muted">{stat.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
