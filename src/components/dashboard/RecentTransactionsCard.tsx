import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { ReceiptText, Plus } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { TransactionRow } from './TransactionRow';
import { CARD_ART } from '../../assets/cards';
import { ToneTabs, type ToneTab } from '../ui/ToneTabs';

type Filter = 'all' | 'income' | 'expense';

const FILTERS: Array<ToneTab<Filter>> = [
  { id: 'all', label: 'Tất cả', tone: 'accent' },
  { id: 'income', label: 'Thu', tone: 'income' },
  { id: 'expense', label: 'Chi', tone: 'expense' },
];

const transactionListVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

export const RecentTransactionsCard: React.FC = () => {
  const { transactions, categories, wallets, deleteTransaction, openAssistant } = useWallet();
  const [filter, setFilter] = useState<Filter>('all');

  const filteredTransactions = transactions
    .filter((tx) => {
      if (filter === 'income') return tx.type === 'income';
      if (filter === 'expense') return tx.type === 'expense';
      return true;
    })
    .slice(0, 10);

  return (
    <Card aria-labelledby="recent-heading" className="flex flex-col">
      <CardHeader
        id="recent-heading"
        title="Giao dịch gần đây"
        art={CARD_ART.receipt}
      />

      {/* Full-width filter: the active pill flows to the chosen tab and takes its colour */}
      <ToneTabs tabs={FILTERS} value={filter} onChange={setFilter} label="Lọc giao dịch" className="mb-4" />

      {filteredTransactions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center border-t border-rule py-12 text-center">
          <ReceiptText className="w-6 h-6 text-muted" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-ink">
            {filter === 'all' ? 'Chưa có giao dịch nào' : 'Không có giao dịch phù hợp'}
          </p>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Nói, gõ hoặc chụp hóa đơn, trợ lý sẽ ghi vào đúng mục.
          </p>
          <Button variant="outline" size="sm" onClick={openAssistant} className="mt-4">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Thêm giao dịch</span>
          </Button>
        </div>
      ) : (
        <motion.ul
          key={filter}
          className="divide-y divide-rule border-t border-rule"
          variants={transactionListVariants}
          initial="hidden"
          animate="show"
        >
          {filteredTransactions.map((tx, index) => (
            <TransactionRow
              key={tx.id}
              index={index}
              tx={tx}
              category={categories.find((c) => c.id === tx.categoryId)}
              wallet={wallets.find((w) => w.id === tx.walletId)}
              toWallet={tx.toWalletId ? wallets.find((w) => w.id === tx.toWalletId) : undefined}
              onDelete={deleteTransaction}
            />
          ))}
        </motion.ul>
      )}
    </Card>
  );
};
