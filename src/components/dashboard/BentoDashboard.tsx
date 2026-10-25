import React from 'react';
import { TotalBalanceCard } from './TotalBalanceCard';
import { WalletsCard } from './WalletsCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { CategoriesCard } from './CategoriesCard';
import { Stagger, StaggerItem } from '../ui/Stagger';

export const BentoDashboard: React.FC = () => {
  return (
    <Stagger className="space-y-6">
      {/* 1. The balance ledger */}
      <StaggerItem>
        <TotalBalanceCard />
      </StaggerItem>

      {/* 2. Where the money sits */}
      <StaggerItem>
        <WalletsCard />
      </StaggerItem>

      {/* 3. What it goes to and comes from */}
      <StaggerItem>
        <CategoriesCard />
      </StaggerItem>

      {/* 4. The latest movements */}
      <StaggerItem>
        <RecentTransactionsCard />
      </StaggerItem>
    </Stagger>
  );
};
