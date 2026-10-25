import React, { useMemo, useState } from 'react';
import { Plus, CreditCard, Pencil, Globe, Landmark, Wallet as WalletIcon } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { Card, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Swatches, ColorTile } from '../ui/Swatches';
import type { CurrencyCode, Wallet } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { convertToVnd, getCurrencyOptions } from '../../services/currency';
import { Select } from '../ui/Select';
import { CARD_ART } from '../../assets/cards';
import { cn } from '../../utils/cn';

const WALLET_ICONS: Record<string, React.ElementType> = {
  Wallet: WalletIcon,
  Landmark,
  CreditCard,
  Globe,
};

export const WalletsCard: React.FC = () => {
  const { wallets, addWallet, updateWallet, exchangeRates } = useWallet();

  // State for Add Wallet Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('VND');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#f97316');
  const [icon, setIcon] = useState('Wallet');

  // State for Edit Wallet Modal: display name and opening balance
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editName, setEditName] = useState('');
  const [editInitialBalance, setEditInitialBalance] = useState('');

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addWallet({
      name: name.trim().slice(0, 60),
      currency,
      initialBalance: parseFloat(initialBalance) || 0,
      color,
      icon,
    });

    setName('');
    setInitialBalance('');
    setIsAddModalOpen(false);
  };

  const startEdit = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setEditName(wallet.name);
    setEditInitialBalance(String(wallet.initialBalance));
  };

  const handleUpdateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet || !editName.trim()) return;

    updateWallet(editingWallet.id, {
      name: editName.trim().slice(0, 60),
      initialBalance: parseFloat(editInitialBalance) || 0,
    });

    setEditingWallet(null);
  };

  const currencyOptions = useMemo(() => getCurrencyOptions(exchangeRates), [exchangeRates]);

  const colorOptions =['#f97316', '#ea580c', '#10b981', '#16a34a', '#3b82f6', '#8b5cf6', '#ec4899', '#dc2626'];
  const iconOptions = [
    { id: 'Wallet', label: 'Ví' },
    { id: 'Landmark', label: 'Ngân hàng' },
    { id: 'CreditCard', label: 'Thẻ' },
    { id: 'Globe', label: 'Quốc tế' },
  ];

  return (
    <Card aria-labelledby="wallets-heading" className="flex flex-col">
      <CardHeader
        id="wallets-heading"
        title={`Nguồn tiền (${wallets.length})`}
        art={CARD_ART.wallets}
        action={
          <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Thêm ví</span>
          </Button>
        }
      />

      {wallets.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-ink">Chưa có nguồn tiền nào</p>
          <p className="mt-1 text-sm text-muted">Thêm ví tiền mặt hoặc tài khoản ngân hàng để bắt đầu.</p>
        </div>
      ) : (
        <ul className="divide-y divide-rule border-t border-rule">
          {wallets.map((wallet) => {
            const { amountVnd } = convertToVnd(wallet.currentBalance, wallet.currency, exchangeRates);
            const isForeign = wallet.currency !== 'VND';
            const Icon = WALLET_ICONS[wallet.icon] ?? WalletIcon;

            return (
              <li key={wallet.id} className="flex items-center gap-3 py-3">
                <ColorTile color={wallet.color}>
                  <Icon className="w-[18px] h-[18px]" />
                </ColorTile>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="truncate">{wallet.name}</span>
                    <span className="hidden sm:inline shrink-0 rounded-chip bg-paper-3 px-1.5 text-xs font-semibold text-muted">
                      {wallet.currency}
                    </span>
                  </p>
                  <p className="figure mt-0.5 truncate text-xs text-muted">
                    Đầu kỳ {formatCurrency(wallet.initialBalance, wallet.currency)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="figure text-sm font-bold text-ink">{formatCurrency(wallet.currentBalance, wallet.currency)}</p>
                  {isForeign && <p className="figure text-xs text-muted">≈ {formatCurrency(amountVnd, 'VND')}</p>}
                </div>

                <button
                  type="button"
                  onClick={() => startEdit(wallet)}
                  className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-control text-muted hover:bg-paper-3 hover:text-ink transition-colors"
                  aria-label={`Sửa ${wallet.name}`}
                  title="Sửa nguồn tiền"
                >
                  <Pencil className="w-4 h-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal: Thêm nguồn tiền mới */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm nguồn tiền"
        description="Ví tiền mặt, tài khoản ngân hàng, PayPal hoặc tài khoản ngoại tệ."
      >
        <form onSubmit={handleCreateWallet} className="space-y-5">
          <div>
            <label htmlFor="wallet-name" className="label">
              Tên nguồn tiền
            </label>
            <input
              id="wallet-name"
              name="walletName"
              type="text"
              required
              maxLength={60}
              autoComplete="off"
              data-autofocus
              placeholder="Techcombank, PayPal USD…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="wallet-currency" className="label">
                Loại tiền
              </label>
              <Select
                id="wallet-currency"
                value={currency}
                options={currencyOptions}
                onChange={(v) => setCurrency(v as CurrencyCode)}
                searchable
                searchPlaceholder="Tìm mã hoặc tên tiền…"
              />
            </div>

            <div>
              <label htmlFor="wallet-initial" className="label">
                Số dư ban đầu ({currency})
              </label>
              <input
                id="wallet-initial"
                name="initialBalance"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="field figure"
              />
            </div>
          </div>

          <fieldset>
            <legend className="label">Biểu tượng</legend>
            <div role="radiogroup" aria-label="Biểu tượng" className="grid grid-cols-4 gap-2">
              {iconOptions.map((opt) => {
                const IconComponent = WALLET_ICONS[opt.id];
                const isSelected = icon === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setIcon(opt.id)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 h-16 rounded-control border text-xs font-semibold transition-colors',
                      isSelected
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-rule-strong text-muted hover:text-ink hover:bg-paper-2'
                    )}
                  >
                    <IconComponent className="w-5 h-5" aria-hidden="true" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <Swatches label="Màu nhận diện" colors={colorOptions} value={color} onChange={setColor} />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Tạo nguồn tiền
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Sửa nguồn tiền */}
      <Modal
        isOpen={Boolean(editingWallet)}
        onClose={() => setEditingWallet(null)}
        title="Sửa nguồn tiền"
        description="Số dư hiện tại được tính lại từ số dư đầu kỳ cộng các giao dịch."
      >
        <form onSubmit={handleUpdateWallet} className="space-y-5">
          <div>
            <label htmlFor="wallet-edit-name" className="label">
              Tên hiển thị
            </label>
            <input
              id="wallet-edit-name"
              name="walletName"
              type="text"
              required
              maxLength={60}
              autoComplete="off"
              data-autofocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="wallet-edit-initial" className="label">
              Số dư đầu kỳ ({editingWallet?.currency})
            </label>
            <input
              id="wallet-edit-initial"
              name="initialBalance"
              type="number"
              inputMode="decimal"
              step="any"
              required
              value={editInitialBalance}
              onChange={(e) => setEditInitialBalance(e.target.value)}
              className="field figure"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingWallet(null)} className="flex-1">
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
