import React, { useState } from 'react';
import { Plus, CreditCard, Edit2, Globe, Landmark, Wallet as WalletIcon, Check } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { CurrencyCode, Wallet } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { convertToVnd } from '../../services/currency';

export const WalletsCard: React.FC = () => {
  const { wallets, addWallet, updateWallet, exchangeRates, isBalanceHidden } = useWallet();

  // State for Add Wallet Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('VND');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#10b981');
  const [icon, setIcon] = useState('Wallet');

  // State for Edit Initial Balance Modal
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editInitialBalance, setEditInitialBalance] = useState('');

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addWallet({
      name: name.trim(),
      currency,
      initialBalance: parseFloat(initialBalance) || 0,
      color,
      icon,
    });

    setName('');
    setInitialBalance('');
    setIsAddModalOpen(false);
  };

  const handleUpdateBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet) return;

    updateWallet(editingWallet.id, {
      initialBalance: parseFloat(editInitialBalance) || 0,
    });

    setEditingWallet(null);
  };

  const colorOptions = ['#10b981', '#3b82f6', '#0284c7', '#8b5cf6', '#ec4899', '#f97316', '#dc2626'];
  const iconOptions = [
    { id: 'Wallet', label: 'Ví', icon: WalletIcon },
    { id: 'Landmark', label: 'Ngân hàng', icon: Landmark },
    { id: 'CreditCard', label: 'Thẻ / PayPal', icon: CreditCard },
    { id: 'Globe', label: 'Quốc tế', icon: Globe },
  ];

  return (
    <Card className="flex flex-col justify-between">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                Nguồn Tiền &bull; Ví ({wallets.length})
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Đa ngoại tệ tự động quy đổi VNĐ
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm nguồn tiền</span>
          </button>
        </div>

        {/* Wallets List */}
        <div className="space-y-3 pt-4">
          {wallets.map((wallet) => {
            const { amountVnd } = convertToVnd(wallet.currentBalance, wallet.currency, exchangeRates);
            const isForeign = wallet.currency !== 'VND';

            return (
              <div
                key={wallet.id}
                className="group p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-white/5 hover:border-emerald-500/30 transition-all duration-200 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                    style={{ backgroundColor: wallet.color }}
                  >
                    {wallet.icon === 'Landmark' ? (
                      <Landmark className="w-5 h-5" />
                    ) : wallet.icon === 'CreditCard' ? (
                      <CreditCard className="w-5 h-5" />
                    ) : wallet.icon === 'Globe' ? (
                      <Globe className="w-5 h-5" />
                    ) : (
                      <WalletIcon className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {wallet.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                        {wallet.currency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      <span>Đầu kỳ: {formatCurrency(wallet.initialBalance, wallet.currency)}</span>
                      <button
                        onClick={() => {
                          setEditingWallet(wallet);
                          setEditInitialBalance(String(wallet.initialBalance));
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-emerald-500 transition-opacity p-0.5"
                        title="Chỉnh sửa số dư ban đầu"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold font-mono text-neutral-900 dark:text-white">
                    {isBalanceHidden
                      ? '••••••'
                      : formatCurrency(wallet.currentBalance, wallet.currency)}
                  </p>
                  {isForeign && (
                    <p className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {isBalanceHidden ? '••••••' : `≈ ${formatCurrency(amountVnd, 'VND')}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Thêm nguồn tiền mới */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm Nguồn Tiền Mới"
        description="Quản lý ví tiền mặt, tài khoản ngân hàng, PayPal, ngoại tệ"
      >
        <form onSubmit={handleCreateWallet} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Tên nguồn tiền / Ví
            </label>
            <input
              type="text"
              required
              placeholder="VD: Techcombank, PayPal USD, Thẻ Ba Lan..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Loại tiền tệ
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="VND">VNĐ (Việt Nam)</option>
                <option value="USD">USD (Mỹ / PayPal)</option>
                <option value="PLN">PLN (Złoty Ba Lan)</option>
                <option value="EUR">EUR (Châu Âu)</option>
                <option value="GBP">GBP (Bảng Anh)</option>
                <option value="JPY">JPY (Yên Nhật)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Số dư ban đầu ({currency})
              </label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Chọn Icon */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Biểu tượng
            </label>
            <div className="grid grid-cols-4 gap-2">
              {iconOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = icon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setIcon(opt.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chọn Màu sắc */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Màu sắc nhận diện
            </label>
            <div className="flex items-center gap-2">
              {colorOptions.map((c) => (
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
              Tạo nguồn tiền
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Chỉnh sửa số dư ban đầu */}
      <Modal
        isOpen={Boolean(editingWallet)}
        onClose={() => setEditingWallet(null)}
        title={`Sửa Số Dư Ban Đầu: ${editingWallet?.name}`}
        description="Hệ thống sẽ tự động cập nhật số dư khả dụng hiện tại tương ứng"
      >
        <form onSubmit={handleUpdateBalance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Số dư ban đầu ({editingWallet?.currency})
            </label>
            <input
              type="number"
              step="any"
              required
              value={editInitialBalance}
              onChange={(e) => setEditInitialBalance(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingWallet(null)}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
