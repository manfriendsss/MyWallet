import React from 'react';
import { ArrowUpRight, ArrowDownRight, Eye, EyeOff, Wallet, TrendingUp } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { formatCurrency } from '../../utils/formatters';

export const TotalBalanceCard: React.FC = () => {
  const {
    totalBalanceVnd,
    totalIncomeThisMonthVnd,
    totalExpenseThisMonthVnd,
    isBalanceHidden,
    toggleBalanceHidden,
    exchangeRates,
  } = useWallet();

  const netSavings = totalIncomeThisMonthVnd - totalExpenseThisMonthVnd;
  const savingsRate =
    totalIncomeThisMonthVnd > 0
      ? Math.round((netSavings / totalIncomeThisMonthVnd) * 100)
      : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-neutral-900 via-neutral-900 to-[#111726] text-white border border-neutral-800 shadow-2xl">
      {/* Decorative ambient lights */}
      <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

      {/* Header: Title & Privacy Eye Toggle */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xs md:text-sm font-medium text-neutral-400 tracking-wide uppercase">
            Tổng Số Dư Khả Dụng (VNĐ)
          </span>
        </div>

        <button
          onClick={toggleBalanceHidden}
          className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Toggle balance privacy"
        >
          {isBalanceHidden ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Big Balance */}
      <div className="relative z-10 my-4 md:my-5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl md:text-5xl font-extrabold font-mono tracking-tight text-white">
            {isBalanceHidden ? '•••••••• ₫' : formatCurrency(totalBalanceVnd, 'VND')}
          </h2>
        </div>

        {/* Currency badges indicator */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
            Tự động quy đổi đa ngoại tệ
          </span>
          <span className="text-[11px] text-neutral-400">
            USD ≈ {exchangeRates.USD.toLocaleString('vi-VN')}₫ &bull; PLN ≈ {exchangeRates.PLN.toLocaleString('vi-VN')}₫
          </span>
        </div>
      </div>

      {/* Income vs Expense Monthly Summary */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 pt-4 border-t border-white/10">
        {/* Thu nhập tháng */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            </div>
            <span>Thu nhập tháng</span>
          </div>
          <p className="text-sm md:text-lg font-bold font-mono text-emerald-400 mt-1.5">
            {isBalanceHidden ? '••••••' : `+${formatCurrency(totalIncomeThisMonthVnd, 'VND')}`}
          </p>
        </div>

        {/* Chi tiêu tháng */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <div className="w-4 h-4 rounded-full bg-rose-500/20 flex items-center justify-center">
              <ArrowDownRight className="w-3 h-3 text-rose-400" />
            </div>
            <span>Chi tiêu tháng</span>
          </div>
          <p className="text-sm md:text-lg font-bold font-mono text-rose-400 mt-1.5">
            {isBalanceHidden ? '••••••' : `-${formatCurrency(totalExpenseThisMonthVnd, 'VND')}`}
          </p>
        </div>

        {/* Dư ròng / Tiết kiệm */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/5">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400">
            <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-indigo-400" />
            </div>
            <span>Dư ròng (Thặng dư)</span>
          </div>
          <p
            className={`text-sm md:text-lg font-bold font-mono mt-1.5 ${
              netSavings >= 0 ? 'text-indigo-400' : 'text-amber-400'
            }`}
          >
            {isBalanceHidden
              ? '••••••'
              : `${netSavings >= 0 ? '+' : ''}${formatCurrency(netSavings, 'VND')} (${savingsRate}%)`}
          </p>
        </div>
      </div>
    </div>
  );
};
