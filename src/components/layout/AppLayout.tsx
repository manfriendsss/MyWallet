import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative flex min-h-dvh bg-paper text-ink">
      <div className="ambient" aria-hidden="true" />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[600] focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-ink"
      >
        Bỏ qua tới nội dung
      </a>

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="relative z-[1] flex-1 flex flex-col min-w-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10">
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 outline-none">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Bar */}
      <BottomNav />
    </div>
  );
};
