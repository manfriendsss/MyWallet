import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-[#0a0d14] text-neutral-900 dark:text-neutral-100 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-8">
        <Header />
        <main className="flex-1 px-4 sm:px-8 py-5 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <BottomNav />
    </div>
  );
};
