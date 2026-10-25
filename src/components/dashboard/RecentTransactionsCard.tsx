import React, { useState } from 'react';
import { Clock, Trash2, ReceiptText, Sparkles } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card } from '../ui/Card';
import { IconRenderer } from '../ui/IconRenderer';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

export const RecentTransactionsCard: React.FC = () => {
  const { transactions, categories, wallets, deleteTransaction, isBalanceHidden, openAssistant } = useWallet();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTransactions = transactions
    .filter((tx) => {
      if (filter === 'income') return tx.type === 'income';
      if (filter === 'expense') return tx.type === 'expense';
      return true;
    })
    .slice(0, 10);

  return (
    <Card className="flex flex-col">
      {/* Header with Title and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 dark:border-white/5 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Giao Dịch Gần Đây (10)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Lịch sử thu & chi mới nhất
            </p>
          </div>
        </div>

        {/* 3 Filter Tabs */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'income'
                ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-neutral-500 hover:text-emerald-600'
            }`}
          >
            Thu nhập
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'expense'
                ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-neutral-500 hover:text-rose-600'
            }`}
          >
            Chi tiêu
          </button>
        </div>
      </div>

      {/* Transaction List */}
      <div className="divide-y divide-neutral-100 dark:divide-white/5 pt-2 flex-1">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center text-neutral-400 mb-3">
              <ReceiptText className="w-6 h-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Chưa có giao dịch nào
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">
              Hãy bấm nút (+) hoặc nói vào Trợ lý AI để tự động thêm giao dịch nhanh chóng!
            </p>
            <button
              onClick={openAssistant}
              className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dùng Trợ lý AI ngay</span>
            </button>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const wallet = wallets.find((w) => w.id === tx.walletId);
            const isIncome = tx.type === 'income';
            const isForeign = tx.currency !== 'VND';

            return (
              <div
                key={tx.id}
                className="py-3 group flex items-center justify-between transition-colors hover:bg-neutral-50/50 dark:hover:bg-white/[0.02] px-1 rounded-xl"
              >
                {/* Left: Category Icon & Details */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: cat?.color || '#64748b' }}
                  >
                    <IconRenderer name={cat?.icon || 'CircleDot'} className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-1">
                        {tx.note || cat?.name || 'Giao dịch'}
                      </span>
                      {tx.isAiGenerated && (
                        <span title="Tạo tự động bởi AI" className="text-[10px] text-indigo-500 font-bold bg-indigo-500/10 px-1 py-0.2 rounded">
                          AI
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      <span>{wallet?.name || 'Ví'}</span>
                      <span>&bull;</span>
                      <span>{formatShortDate(tx.date)} {tx.time || ''}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Delete Button */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold font-mono ${
                        isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isBalanceHidden
                        ? '••••••'
                        : `${isIncome ? '+' : '-'}${formatCurrency(tx.amount, tx.currency)}`}
                    </p>
                    {isForeign && (
                      <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                        {isBalanceHidden
                          ? '••••••'
                          : `≈ ${formatCurrency(tx.amountVnd, 'VND')}`}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                    title="Xóa giao dịch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};
