import React from 'react';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import { NAV_ITEMS } from './navItems';
import { Tooltip } from '../ui/Tooltip';

export const Header: React.FC = () => {
  const { activeTab, goBack } = useWallet();
  const { isDark, toggleTheme } = useTheme();
  const current = NAV_ITEMS.find((item) => item.id === activeTab);
  // The full history is a sub-page of Tổng quan: it gets a back arrow, not the logo
  const isSubPage = activeTab === 'transactions';
  const title = isSubPage ? 'Tất cả giao dịch' : (current?.title ?? 'MyWallet');

  return (
    <header className="sticky top-0 z-[300] w-full border-b border-rule bg-surface pt-[env(safe-area-inset-top)]">
      <div className="max-w-[1200px] mx-auto h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {isSubPage ? (
            <button
              type="button"
              onClick={goBack}
              aria-label="Về Tổng quan"
              className="-ml-2 grid h-10 w-10 place-items-center rounded-control text-ink hover:bg-paper-3 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <img src="/logo.webp" alt="" width={32} height={32} className="md:hidden w-8 h-8 object-contain" />
          )}
          <h1 className="text-lg text-ink truncate">{title}</h1>
        </div>

        <Tooltip content={isDark ? 'Giao diện sáng' : 'Giao diện tối'}>
          <button
            type="button"
            onClick={toggleTheme}
            className="grid h-10 w-10 place-items-center rounded-control text-muted hover:bg-paper-3 hover:text-ink transition-colors"
            aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          >
            {isDark ? <Sun className="w-[18px] h-[18px]" aria-hidden="true" /> : <Moon className="w-[18px] h-[18px]" aria-hidden="true" />}
          </button>
        </Tooltip>
      </div>
    </header>
  );
};
