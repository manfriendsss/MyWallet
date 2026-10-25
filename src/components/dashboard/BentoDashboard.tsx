import React from 'react';
import { TotalBalanceCard } from './TotalBalanceCard';
import { WalletsCard } from './WalletsCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { CategoriesCard } from './CategoriesCard';

export const BentoDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* 1. The balance ledger */}
      <TotalBalanceCard />

      {/* 2. Recent activity leads; sources sit beside it */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 lg:order-2 min-w-0">
          <RecentTransactionsCard />
        </div>
        <div className="lg:col-span-5 lg:order-1 min-w-0">
          <WalletsCard />
        </div>
      </div>

      {/* 3. Categories */}
      <CategoriesCard />
    </div>
  );
};
