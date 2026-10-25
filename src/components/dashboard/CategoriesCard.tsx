import React, { useState } from 'react';
import { Plus, Tags, Check, FolderPlus } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { IconRenderer } from '../ui/IconRenderer';
import type { TransactionType } from '../../types';
import { formatCompactCurrency } from '../../utils/formatters';

export const CategoriesCard: React.FC = () => {
  const { categories, transactions, addCategory, isBalanceHidden } = useWallet();
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');

  // State for Add Category Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#f97316');

  // Filter categories by activeTab (income vs expense)
  const tabCategories = categories.filter((c) => c.type === activeTab);

  // Compute current month totals for each category
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const categoryTotals: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.date.startsWith(currentYearMonth) && tx.type === activeTab) {
      categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + tx.amountVnd;
    }
  }

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCategory({
      name: name.trim(),
      type: activeTab,
      icon,
      color,
    });

    setName('');
    setIsAddModalOpen(false);
  };

  const availableIcons = [
    'Utensils', 'ShoppingBag', 'Car', 'Home', 'Film', 'HeartPulse',
    'GraduationCap', 'Coffee', 'Plane', 'Laptop', 'Gift', 'Briefcase',
    'Award', 'TrendingUp', 'WalletCards', 'CircleEllipsis'
  ];

  const availableColors = [
    '#f97316', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#ef4444',
    '#10b981', '#f59e0b', '#6366f1', '#06b6d4', '#64748b', '#84cc16'
  ];

  return (
    <Card className="flex flex-col">
      {/* Header with Title and 2 Tabs (Thu nhập vs Chi tiêu) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 dark:border-white/5 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Tags className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Danh Mục Thu & Chi
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Phân loại nguồn tiền và các khoản chi tiêu
            </p>
          </div>
        </div>

        {/* 2 Tabs: Chi tiêu vs Thu nhập */}
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('expense')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-white dark:bg-neutral-800 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-neutral-500 hover:text-rose-600'
            }`}
          >
            Chi tiêu ({categories.filter((c) => c.type === 'expense').length})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'income'
                ? 'bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-neutral-500 hover:text-emerald-600'
            }`}
          >
            Thu nhập ({categories.filter((c) => c.type === 'income').length})
          </button>
        </div>
      </div>

      {/* Grid of Mini Category Cards + Dashed Add Card */}
      <div className="pt-4 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tabCategories.map((cat) => {
            const totalThisMonth = categoryTotals[cat.id] || 0;

            return (
              <div
                key={cat.id}
                className="p-3 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-white/5 hover:border-neutral-300 dark:hover:border-white/20 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  >
                    <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                    {cat.name}
                  </span>
                </div>

                <div className="mt-2 text-right">
                  <span className="text-[10px] text-neutral-400 block">Tháng này</span>
                  <span className="text-xs font-bold font-mono text-neutral-900 dark:text-white">
                    {isBalanceHidden ? '••••••' : formatCompactCurrency(totalThisMonth, 'VND')}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Dấu + Card viền nét đứt theo yêu cầu */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="p-3 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700/80 hover:border-emerald-500 dark:hover:border-emerald-500/60 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 min-h-[82px] cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 group-hover:bg-emerald-500/20 text-neutral-500 group-hover:text-emerald-500 flex items-center justify-center transition-colors">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 group-hover:text-emerald-500">
              Thêm danh mục
            </span>
          </button>
        </div>

        {/* Empty state if no categories */}
        {tabCategories.length === 0 && (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <FolderPlus className="w-8 h-8 text-neutral-400 mb-2" />
            <p className="text-xs text-neutral-400">Chưa có danh mục nào trong mục này</p>
          </div>
        )}
      </div>

      {/* Modal: Thêm Danh Mục Mới */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Thêm Danh Mục ${activeTab === 'income' ? 'Thu Nhập' : 'Chi Tiêu'}`}
        description="Đặt tên và chọn biểu tượng dễ nhớ cho danh mục của bạn"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Tên danh mục
            </label>
            <input
              type="text"
              required
              placeholder={activeTab === 'income' ? 'VD: Lương, Cổ tức, Tiền thưởng...' : 'VD: Cà phê, Du lịch, Tiền điện...'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Chọn Icon */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Chọn biểu tượng
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-36 overflow-y-auto no-scrollbar p-1">
              {availableIcons.map((ic) => {
                const isSelected = icon === ic;
                return (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`p-2 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <IconRenderer name={ic} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn Màu sắc */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Chọn màu sắc
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {availableColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Tạo danh mục
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
