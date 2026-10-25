import React from 'react';
import { TotalBalanceCard } from './TotalBalanceCard';
import { WalletsCard } from './WalletsCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { CategoriesCard } from './CategoriesCard';

export const BentoDashboard: React.FC = () => {
  return (
    <div className="space-y-5 md:space-y-6">
      {/* 1. Big Balance Card (Full width on both mobile and desktop) */}
      <TotalBalanceCard />

      {/* 2. Desktop Bento Grid / Mobile 1-Column Stack */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6">
        {/* Nguồn tiền / Ví (Lg: 5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <WalletsCard />
        </div>

        {/* 10 Giao dịch gần nhất (Lg: 7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <RecentTransactionsCard />
        </div>

        {/* Danh mục Thu & Chi (Lg: 12 cols full width bottom card) */}
        <div className="lg:col-span-12 flex flex-col">
          <CategoriesCard />
        </div>
      </div>
    </div>
  );
};
