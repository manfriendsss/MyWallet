import React from 'react';
import { Eye, EyeOff, Sun, Moon, Sparkles } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useTheme } from '../../context/ThemeContext';

export const Header: React.FC = () => {
  const { isBalanceHidden, toggleBalanceHidden, openAssistant } = useWallet();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full px-4 sm:px-8 py-3.5 bg-neutral-50/80 dark:bg-[#0a0d14]/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-white/[0.05] flex items-center justify-between">
      {/* Left: Mobile Brand & Tagline */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2.5">
          <img
            src="/logo.webp"
            alt="MyWallet Logo"
            className="w-8 h-8 object-contain rounded-lg drop-shadow"
          />
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            MyWallet
          </span>
        </div>

        <div className="hidden md:block">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
            Tài chính Cá nhân
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Tự động quy đổi ngoại tệ &bull; Trợ lý AI bảo mật
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Assistant button (mobile top action) */}
        <button
          onClick={openAssistant}
          className="flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI</span>
        </button>

        {/* Hide/Show Balance toggle */}
        <button
          onClick={toggleBalanceHidden}
          className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
          title={isBalanceHidden ? 'Hiện số dư' : 'Ẩn số dư bảo mật'}
          aria-label="Toggle balance privacy"
        >
          {isBalanceHidden ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors"
          title={isDark ? 'Giao diện Sáng' : 'Giao diện Tối'}
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>
    </header>
  );
};
