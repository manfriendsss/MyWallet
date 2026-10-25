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

      {/* 2. Where the money sits */}
      <WalletsCard />

      {/* 3. What it goes to and comes from */}
      <CategoriesCard />

      {/* 4. The latest movements */}
      <RecentTransactionsCard />
    </div>
  );
};
