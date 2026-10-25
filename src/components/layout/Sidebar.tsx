import React from 'react';
import { LayoutDashboard, CalendarDays, BarChart3, Settings, Plus, Sparkles, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';
import type { ActiveTab } from '../../types';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/formatters';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, openAssistant, totalBalanceVnd, isBalanceHidden } = useWallet();
  const { isDark, toggleTheme } = useTheme();

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Trang chủ', icon: LayoutDashboard },
    { id: 'calendar', label: 'Lịch thu chi', icon: CalendarDays },
    { id: 'analytics', label: 'Thống kê & Báo cáo', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 bg-white/70 dark:bg-[#0c101a]/80 backdrop-blur-2xl border-r border-neutral-200/80 dark:border-white/[0.08] p-5 justify-between select-none z-30">
      {/* Brand Logo & Name */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <img
            src="/logo.webp"
            alt="MyWallet Logo"
            className="w-10 h-10 object-contain drop-shadow-md rounded-xl"
            loading="eager"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
                MyWallet
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                AI 2.0
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-400 font-medium">
              Quản lý chi tiêu thông minh
            </p>
          </div>
        </div>

        {/* Action Button: Trợ lý AI */}
        <button
          onClick={openAssistant}
          className="w-full relative group overflow-hidden rounded-2xl p-px font-semibold text-white transition-all duration-300 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 active:scale-[0.98] cursor-pointer"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 transition-all duration-300" />
          <div className="relative flex items-center justify-center gap-2.5 px-4 py-3 bg-neutral-900/10 backdrop-blur-sm rounded-2xl">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="text-sm font-semibold tracking-wide">Trợ lý Chi tiêu AI</span>
            <Plus className="w-4 h-4 ml-auto opacity-70 group-hover:rotate-90 transition-transform duration-200" />
          </div>
        </button>

        {/* Navigation items */}
        <nav className="space-y-1.5 pt-2">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer relative',
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.04]'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    isActive ? 'text-emerald-600 dark:text-emerald-400 scale-110' : 'text-neutral-400'
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute right-3 w-1.5 h-5 rounded-full bg-emerald-500"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Mini stats & Theme toggle */}
      <div className="space-y-4 pt-4 border-t border-neutral-200/80 dark:border-white/[0.08]">
        {/* Quick balance card */}
        <div className="p-3.5 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-white/5">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
            Tổng số dư khả dụng
          </p>
          <p className="text-base font-bold font-mono text-neutral-900 dark:text-white mt-1">
            {isBalanceHidden ? '•••••••• ₫' : formatCurrency(totalBalanceVnd, 'VND')}
          </p>
        </div>

        {/* Theme toggle & Status */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Sẵn sàng</span>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
