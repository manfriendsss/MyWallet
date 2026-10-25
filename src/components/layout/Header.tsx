import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { NAV_ITEMS } from './navItems';

export const Header: React.FC = () => {
  const { activeTab } = useWallet();
  const { isDark, toggleTheme } = useTheme();
  const current = NAV_ITEMS.find((item) => item.id === activeTab);

  return (
    <header className="sticky top-0 z-[300] w-full border-b border-rule bg-paper/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="max-w-[1200px] mx-auto h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.webp" alt="" width={32} height={32} className="md:hidden w-8 h-8 object-contain" />
          <h1 className="text-lg text-ink truncate">{current?.title ?? 'MyWallet'}</h1>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-10 w-10 place-items-center rounded-control text-muted hover:bg-paper-3 hover:text-ink transition-colors"
          aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          title={isDark ? 'Giao diện sáng' : 'Giao diện tối'}
        >
          {isDark ? <Sun className="w-[18px] h-[18px]" aria-hidden="true" /> : <Moon className="w-[18px] h-[18px]" aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
};
