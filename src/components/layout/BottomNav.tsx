import React from 'react';
import { LayoutDashboard, CalendarDays, Plus, BarChart3, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '../../context/WalletContext';
import type { ActiveTab } from '../../types';
import { cn } from '../../utils/cn';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, openAssistant } = useWallet();

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ElementType }> = [
    { id: 'dashboard', label: 'Trang chủ', icon: LayoutDashboard },
    { id: 'calendar', label: 'Lịch', icon: CalendarDays },
    { id: 'analytics', label: 'Thống kê', icon: BarChart3 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-safe pt-1">
      <div className="relative flex items-center justify-around h-16 bg-white/90 dark:bg-[#0f131f]/90 backdrop-blur-2xl border border-neutral-200/80 dark:border-white/10 rounded-3xl shadow-2xl shadow-black/20 px-2 mb-2">
        {/* Item 1: Trang chủ */}
        <button
          onClick={() => setActiveTab(navItems[0].id)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative',
            activeTab === navItems[0].id
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          )}
        >
          {React.createElement(navItems[0].icon, { className: 'w-5 h-5' })}
          <span className="text-[11px] mt-1">{navItems[0].label}</span>
          {activeTab === navItems[0].id && (
            <motion.div
              layoutId="activeTabIndicatorMobile"
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500"
            />
          )}
        </button>

        {/* Item 2: Lịch */}
        <button
          onClick={() => setActiveTab(navItems[1].id)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative',
            activeTab === navItems[1].id
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          )}
        >
          {React.createElement(navItems[1].icon, { className: 'w-5 h-5' })}
          <span className="text-[11px] mt-1">{navItems[1].label}</span>
          {activeTab === navItems[1].id && (
            <motion.div
              layoutId="activeTabIndicatorMobile"
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500"
            />
          )}
        </button>

        {/* CENTER BUTTON: (+) TRỢ LÝ AI */}
        <div className="flex-1 flex justify-center -mt-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            onClick={openAssistant}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 border-4 border-neutral-50 dark:border-[#0a0d14] cursor-pointer"
            aria-label="Mở Trợ lý Chi tiêu AI"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </motion.button>
        </div>

        {/* Item 3: Thống kê */}
        <button
          onClick={() => setActiveTab(navItems[2].id)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative',
            activeTab === navItems[2].id
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          )}
        >
          {React.createElement(navItems[2].icon, { className: 'w-5 h-5' })}
          <span className="text-[11px] mt-1">{navItems[2].label}</span>
          {activeTab === navItems[2].id && (
            <motion.div
              layoutId="activeTabIndicatorMobile"
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500"
            />
          )}
        </button>

        {/* Item 4: Cài đặt */}
        <button
          onClick={() => setActiveTab(navItems[3].id)}
          className={cn(
            'flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 relative',
            activeTab === navItems[3].id
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
          )}
        >
          {React.createElement(navItems[3].icon, { className: 'w-5 h-5' })}
          <span className="text-[11px] mt-1">{navItems[3].label}</span>
          {activeTab === navItems[3].id && (
            <motion.div
              layoutId="activeTabIndicatorMobile"
              className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-500"
            />
          )}
        </button>
      </div>
    </div>
  );
};
