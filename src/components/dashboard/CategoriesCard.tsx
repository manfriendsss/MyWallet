import React, { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { IconRenderer } from '../ui/IconRenderer';
import { Swatches, ColorTile } from '../ui/Swatches';
import type { Category, TransactionType } from '../../types';
import { formatCompactCurrency } from '../../utils/formatters';
import { CARD_ART } from '../../assets/cards';
import { cn } from '../../utils/cn';

const AVAILABLE_ICONS = [
  'Utensils', 'ShoppingBag', 'Car', 'Home', 'Film', 'HeartPulse',
  'GraduationCap', 'Coffee', 'Plane', 'Laptop', 'Gift', 'Briefcase',
  'Award', 'TrendingUp', 'WalletCards', 'CircleEllipsis',
];

const AVAILABLE_COLORS = [
  '#f97316', '#ea580c', '#f59e0b', '#10b981', '#16a34a', '#84cc16',
  '#14b8a6', '#3b82f6', '#6366f1', '#ec4899', '#ef4444', '#64748b',
];

export const CategoriesCard: React.FC = () => {
  const { categories, transactions, addCategory, updateCategory } = useWallet();
  const [activeTab, setActiveTab] = useState<TransactionType>('expense');

  // One form for adding and editing: editing holds the category being changed
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('Tag');
  const [color, setColor] = useState('#f97316');

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

  const openAdd = () => {
    setEditing(null);
    setName('');
    setIcon('Tag');
    setColor('#f97316');
    setIsFormOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().slice(0, 40);
    if (!cleanName) return;

    if (editing) {
      updateCategory(editing.id, { name: cleanName, icon, color });
    } else {
      addCategory({ name: cleanName, type: activeTab, icon, color });
    }
    setIsFormOpen(false);
  };

  const countOf = (type: TransactionType) => categories.filter((c) => c.type === type).length;
  const formType = editing?.type ?? activeTab;

  return (
    <Card aria-labelledby="categories-heading" className="flex flex-col">
      <CardHeader
        id="categories-heading"
        title="Danh mục"
        art={CARD_ART.categories}
        action={
          <div className="seg" role="group" aria-label="Loại danh mục">
            <button type="button" aria-pressed={activeTab === 'expense'} onClick={() => setActiveTab('expense')}>
              Chi ({countOf('expense')})
            </button>
            <button type="button" aria-pressed={activeTab === 'income'} onClick={() => setActiveTab('income')}>
              Thu ({countOf('income')})
            </button>
          </div>
        }
      />

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 border-t border-rule">
        {tabCategories.map((cat) => {
          const totalThisMonth = categoryTotals[cat.id] || 0;
          return (
            <li key={cat.id} className="flex items-center gap-3 border-b border-rule py-2">
              <ColorTile color={cat.color} size="sm">
                <IconRenderer name={cat.icon} className="w-3.5 h-3.5" />
              </ColorTile>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{cat.name}</span>
              <span className={cn('figure text-sm font-semibold', totalThisMonth ? 'text-ink' : 'text-muted')}>
                {formatCompactCurrency(totalThisMonth, 'VND')}
              </span>
              <button
                type="button"
                onClick={() => openEdit(cat)}
                aria-label={`Sửa danh mục ${cat.name}`}
                title="Sửa danh mục"
                className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-control text-muted hover:bg-paper-3 hover:text-ink transition-colors"
              >
                <Pencil className="w-4 h-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      {tabCategories.length === 0 && (
        <p className="py-8 text-center text-sm text-muted">Chưa có danh mục nào trong mục này.</p>
      )}

      <div className="pt-3">
        <Button variant="ghost" size="sm" onClick={openAdd} className="-ml-3 text-accent hover:text-accent-hover">
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Thêm danh mục {activeTab === 'income' ? 'thu' : 'chi'}</span>
        </Button>
      </div>

      {/* Modal: thêm hoặc sửa danh mục */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={`${editing ? 'Sửa' : 'Thêm'} danh mục ${formType === 'income' ? 'thu nhập' : 'chi tiêu'}`}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="category-name" className="label">
              Tên danh mục
            </label>
            <input
              id="category-name"
              name="categoryName"
              type="text"
              required
              maxLength={40}
              autoComplete="off"
              data-autofocus
              placeholder={formType === 'income' ? 'Cổ tức, tiền thưởng…' : 'Cà phê, du lịch, tiền điện…'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
            />
          </div>

          <fieldset>
            <legend className="label">Biểu tượng</legend>
            <div role="radiogroup" aria-label="Biểu tượng" className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {AVAILABLE_ICONS.map((ic) => {
                const isSelected = icon === ic;
                return (
                  <button
                    key={ic}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={ic}
                    onClick={() => setIcon(ic)}
                    className={cn(
                      'grid h-10 place-items-center rounded-control border transition-colors',
                      isSelected
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-rule-strong text-muted hover:bg-paper-2 hover:text-ink'
                    )}
                  >
                    <IconRenderer name={ic} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Swatches label="Màu sắc" colors={AVAILABLE_COLORS} value={color} onChange={setColor} />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="flex-1">
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              {editing ? 'Lưu thay đổi' : 'Tạo danh mục'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
