import React from 'react';
import { Plus } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/formatters';
import { NAV_ITEMS } from './navItems';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, openAssistant, totalBalanceVnd } = useWallet();

  return (
    <aside className="hidden md:flex flex-col w-60 lg:w-64 h-dvh sticky top-0 bg-paper-2/70 backdrop-blur-md border-r border-rule px-3 py-4 z-[200]">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-2 h-10">
        <img
          src="/logo.webp"
          alt=""
          width={32}
          height={32}
          className="w-8 h-8 object-contain"
          loading="eager"
        />
        <div className="min-w-0">
          <p className="text-md font-bold text-ink leading-tight">MyWallet</p>
          <p className="text-xs text-muted leading-tight">Quản lý chi tiêu thông minh</p>
        </div>
      </div>

      {/* Primary action: the assistant adds transactions */}
      <button
        type="button"
        onClick={openAssistant}
        className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-control bg-[image:var(--gradient-accent)] px-4 text-sm font-semibold text-accent-ink shadow-[0_8px_20px_-8px_var(--color-glow-1)] hover:brightness-105 transition-[filter]"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>Thêm giao dịch</span>
      </button>

      {/* Navigation */}
      <nav aria-label="Điều hướng chính" className="mt-6">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 h-10 px-3 rounded-control text-sm font-semibold transition-colors',
                    isActive ? 'bg-surface text-ink' : 'text-muted hover:bg-paper-3 hover:text-ink'
                  )}
                >
                  <Icon className={cn('w-[18px] h-[18px]', isActive && 'text-accent')} aria-hidden="true" />
                  <span>{item.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Balance at a glance */}
      <div className="mt-auto border-t border-rule px-2 pt-4">
        <p className="text-xs text-muted">Tổng số dư</p>
        <p className="figure mt-1 text-md font-bold text-ink">
          {formatCurrency(totalBalanceVnd, 'VND')}
        </p>
      </div>
    </aside>
  );
};
