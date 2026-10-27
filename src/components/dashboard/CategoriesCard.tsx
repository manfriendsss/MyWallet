import React, { useState } from 'react';
import { useWallet } from '../../context/WalletContext';
import { Card, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { IconRenderer, CATEGORY_ICON_GROUPS } from '../ui/IconRenderer';
import { Swatches } from '../ui/Swatches';
import { TileGrid, GridTile, AddTile } from '../ui/GridTile';
import { ToneTabs } from '../ui/ToneTabs';
import type { Category, TransactionType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { CARD_ART } from '../../assets/cards';
import { cn } from '../../utils/cn';



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
  const [budget, setBudget] = useState('');

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
    setBudget('');
    setIsFormOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setBudget(cat.budget && cat.budget > 0 ? String(cat.budget) : '');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().slice(0, 40);
    if (!cleanName) return;
    const parsedBudget = Number(budget);
    const categoryBudget = budget.trim() && Number.isFinite(parsedBudget) && parsedBudget > 0
      ? parsedBudget
      : undefined;

    if (editing) {
      updateCategory(editing.id, {
        name: cleanName,
        icon,
        color,
        ...(formType === 'expense' ? { budget: categoryBudget } : {}),
      });
    } else {
      addCategory({
        name: cleanName,
        type: activeTab,
        icon,
        color,
        ...(formType === 'expense' ? { budget: categoryBudget } : {}),
      });
    }
    setIsFormOpen(false);
  };

  const formType = editing?.type ?? activeTab;

  return (
    <Card aria-labelledby="categories-heading" className="flex flex-col">
      <CardHeader
        id="categories-heading"
        title="Danh mục"
        art={CARD_ART.categories}
      />

      {/* Full-width tabs; the pill flows between them like the transaction filter */}
      <ToneTabs
        tabs={[
          { id: 'expense', label: 'Chi tiêu', tone: 'expense' },
          { id: 'income', label: 'Thu nhập', tone: 'income' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        label="Loại danh mục"
        className="mb-4"
      />

      <TileGrid label={activeTab === 'income' ? 'Danh mục thu nhập' : 'Danh mục chi tiêu'}>
        {tabCategories.map((cat) => {
          const totalThisMonth = categoryTotals[cat.id] || 0;
          return (
            <GridTile
              key={cat.id}
              color={cat.color}
              icon={<IconRenderer name={cat.icon} className="h-[22px] w-[22px]" />}
              name={cat.name}
              amount={formatCurrency(totalThisMonth, 'VND')}
              muted={!totalThisMonth}
              progress={
                cat.type === 'expense' && cat.budget && cat.budget > 0
                  ? { spent: totalThisMonth, budget: cat.budget }
                  : undefined
              }
              onClick={() => openEdit(cat)}
              editLabel="Sửa danh mục"
            />
          );
        })}
        <AddTile label={activeTab === 'income' ? 'Thêm mục thu' : 'Thêm mục chi'} onClick={openAdd} />
      </TileGrid>
      <p className="mt-3 text-xs text-muted">Số tiền là tổng phát sinh trong tháng này.</p>

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
            {/* Grouped by topic, scrolls inside the form */}
            <div role="radiogroup" aria-label="Biểu tượng" className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {CATEGORY_ICON_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="mb-1.5 text-xs font-semibold text-muted">{group.label}</p>
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                    {group.icons.map((ic) => {
                      const isSelected = icon === ic;
                      return (
                        <button
                          key={ic}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          aria-label={`${group.label}: ${ic}`}
                          onClick={() => setIcon(ic)}
                          className={cn(
                            'grid h-10 place-items-center rounded-control border transition-colors',
                            isSelected
                              ? 'border-accent bg-accent-soft text-ink'
                              : 'border-rule-strong text-muted hover:bg-paper-2 hover:text-ink'
                          )}
                        >
                          <IconRenderer name={ic} className="w-[18px] h-[18px]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <Swatches label="Màu sắc" colors={AVAILABLE_COLORS} value={color} onChange={setColor} />

          {formType === 'expense' ? (
            <div>
              <label htmlFor="category-budget" className="label">
                Ngân sách tháng (đ)
              </label>
              <MoneyInput
                id="category-budget"
                name="categoryBudget"
                placeholder="Không giới hạn"
                value={budget}
                onValueChange={setBudget}
                className="field"
              />
            </div>
          ) : null}

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
