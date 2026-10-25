import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Bitcoin,
  Coins,
  CreditCard,
  Globe,
  Landmark,
  PiggyBank,
  Smartphone,
  Trash2,
  Wallet as WalletIcon,
} from 'lucide-react';
import { ToneTabs } from '../ui/ToneTabs';
import { useWallet } from '../../context/WalletContext';
import { Card, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Swatches } from '../ui/Swatches';
import { TileGrid, GridTile, AddTile } from '../ui/GridTile';
import { PaypalIcon, PAYPAL_BLUE } from '../ui/BrandIcon';
import type { CurrencyCode, Wallet } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { convertToVnd, getCurrencyOptions } from '../../services/currency';
import { Select } from '../ui/Select';
import { CARD_ART } from '../../assets/cards';
import { cn } from '../../utils/cn';

const WALLET_ICONS: Record<string, React.ElementType> = {
  Wallet: WalletIcon,
  Banknote,
  Landmark,
  CreditCard,
  PayPal: PaypalIcon,
  Smartphone,
  PiggyBank,
  Coins,
  Bitcoin,
  Globe,
};

const ICON_OPTIONS = [
  { id: 'Wallet', label: 'Ví' },
  { id: 'Banknote', label: 'Tiền mặt' },
  { id: 'Landmark', label: 'Ngân hàng' },
  { id: 'CreditCard', label: 'Thẻ' },
  { id: 'PayPal', label: 'PayPal' },
  { id: 'Smartphone', label: 'Ví điện tử' },
  { id: 'PiggyBank', label: 'Tiết kiệm' },
  { id: 'Coins', label: 'Đầu tư' },
  { id: 'Bitcoin', label: 'Crypto' },
  { id: 'Globe', label: 'Quốc tế' },
];

const COLOR_OPTIONS = ['#f97316', '#ea580c', '#10b981', '#16a34a', '#3b82f6', PAYPAL_BLUE, '#8b5cf6', '#ec4899', '#dc2626'];

/** Icon picker shared by the add and edit forms */
const IconPicker: React.FC<{ value: string; onChange: (id: string) => void }> = ({ value, onChange }) => (
  <fieldset>
    <legend className="label">Biểu tượng</legend>
    <div role="radiogroup" aria-label="Biểu tượng" className="grid grid-cols-5 gap-2">
      {ICON_OPTIONS.map((opt) => {
        const IconComponent = WALLET_ICONS[opt.id];
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 h-16 rounded-control border text-xs font-semibold transition-colors',
              isSelected ? 'border-accent bg-accent-soft text-ink' : 'border-rule-strong text-muted hover:text-ink hover:bg-paper-2'
            )}
          >
            <IconComponent className="w-5 h-5" aria-hidden="true" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  </fieldset>
);

export const WalletsCard: React.FC = () => {
  const { wallets, transactions, addWallet, updateWallet, deleteWallet, addTransfer, exchangeRates } = useWallet();

  // State for Add Wallet Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [kind, setKind] = useState<'cash' | 'credit'>('cash');
  const [creditLimit, setCreditLimit] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('VND');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#f97316');
  const [icon, setIcon] = useState('Wallet');

  // State for Edit Wallet Modal: name, opening balance, icon and colour
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editName, setEditName] = useState('');
  const [editInitialBalance, setEditInitialBalance] = useState('');
  const [editIcon, setEditIcon] = useState('Wallet');
  const [editColor, setEditColor] = useState('#f97316');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleCreateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const opening = parseFloat(initialBalance) || 0;
    const limit = parseFloat(creditLimit);
    addWallet({
      name: name.trim().slice(0, 60),
      currency,
      // A card's opening figure is what is owed, stored as a negative balance
      initialBalance: kind === 'credit' ? -Math.abs(opening) : opening,
      color,
      icon,
      kind,
      creditLimit: kind === 'credit' && limit > 0 ? limit : undefined,
    });

    setName('');
    setInitialBalance('');
    setCreditLimit('');
    setKind('cash');
    setIsAddModalOpen(false);
  };

  const chooseKind = (next: 'cash' | 'credit') => {
    setKind(next);
    if (next === 'credit' && icon === 'Wallet') {
      setIcon('CreditCard');
      setColor('#dc2626');
    }
  };

  const startEdit = (wallet: Wallet) => {
    const isCard = wallet.kind === 'credit';
    setEditingWallet(wallet);
    setEditName(wallet.name);
    // Cards show their opening debt as a positive number
    setEditInitialBalance(String(isCard ? Math.abs(wallet.initialBalance) : wallet.initialBalance));
    setEditLimit(wallet.creditLimit ? String(wallet.creditLimit) : '');
    setEditIcon(wallet.icon);
    setEditColor(wallet.color);
    setConfirmingDelete(false);
    setPayFrom(wallets.find((w) => w.kind !== 'credit' && w.id !== wallet.id)?.id ?? '');
    setPayAmount(isCard && wallet.currentBalance < 0 ? String(-wallet.currentBalance) : '');
  };

  const handleUpdateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet || !editName.trim()) return;
    const isCard = editingWallet.kind === 'credit';
    const opening = parseFloat(editInitialBalance) || 0;
    const limit = parseFloat(editLimit);

    updateWallet(editingWallet.id, {
      name: editName.trim().slice(0, 60),
      initialBalance: isCard ? -Math.abs(opening) : opening,
      creditLimit: isCard && limit > 0 ? limit : undefined,
      icon: editIcon,
      color: editColor,
    });

    setEditingWallet(null);
  };

  // Paying off a card: a transfer from one of your other wallets
  const [payFrom, setPayFrom] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const payableFrom = wallets.filter((w) => w.kind !== 'credit' && w.id !== editingWallet?.id);
  const handlePayCard = () => {
    const amount = parseFloat(payAmount);
    if (!editingWallet || !payFrom || !(amount > 0)) return;
    addTransfer(payFrom, editingWallet.id, amount);
    setEditingWallet(null);
  };

  const editingTxCount = editingWallet ? transactions.filter((t) => t.walletId === editingWallet.id).length : 0;

  const handleDelete = () => {
    if (!editingWallet) return;
    deleteWallet(editingWallet.id);
    setEditingWallet(null);
  };

  const currencyOptions = useMemo(() => getCurrencyOptions(exchangeRates), [exchangeRates]);

  return (
    <Card aria-labelledby="wallets-heading" className="flex flex-col">
      <CardHeader id="wallets-heading" title={`Nguồn tiền (${wallets.length})`} art={CARD_ART.wallets} />

      <TileGrid label="Nguồn tiền">
        {wallets.map((wallet) => {
          const { amountVnd } = convertToVnd(wallet.currentBalance, wallet.currency, exchangeRates);
          const Icon = WALLET_ICONS[wallet.icon] ?? WalletIcon;
          const isCard = wallet.kind === 'credit';
          const owed = isCard ? Math.max(0, -wallet.currentBalance) : 0;
          const left = isCard && wallet.creditLimit ? wallet.creditLimit - owed : null;
          return (
            <GridTile
              key={wallet.id}
              color={wallet.color}
              icon={<Icon className="h-[22px] w-[22px]" />}
              name={wallet.name}
              amount={
                isCard
                  ? owed > 0
                    ? `−${formatCurrency(owed, wallet.currency)}`
                    : 'Hết nợ'
                  : formatCurrency(wallet.currentBalance, wallet.currency)
              }
              debt={owed > 0}
              sub={
                left !== null
                  ? `Còn ${formatCurrency(left, wallet.currency)}`
                  : wallet.currency !== 'VND'
                    ? `≈ ${formatCurrency(Math.abs(amountVnd), 'VND')}`
                    : undefined
              }
              onClick={() => startEdit(wallet)}
              editLabel={isCard ? 'Thẻ tín dụng' : 'Sửa nguồn tiền'}
            />
          );
        })}
        <AddTile label="Thêm ví" onClick={() => setIsAddModalOpen(true)} />
      </TileGrid>

      {/* Modal: Thêm nguồn tiền mới */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Thêm nguồn tiền"
      >
        <form onSubmit={handleCreateWallet} className="space-y-5">
          <ToneTabs
            tabs={[
              { id: 'cash', label: 'Tiền / Tài khoản', tone: 'accent' },
              { id: 'credit', label: 'Thẻ tín dụng', tone: 'expense' },
            ]}
            value={kind}
            onChange={chooseKind}
            label="Loại nguồn tiền"
          />

          <div>
            <label htmlFor="wallet-name" className="label">
              {kind === 'credit' ? 'Tên thẻ' : 'Tên nguồn tiền'}
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
                {kind === 'credit' ? `Dư nợ hiện tại (${currency})` : `Số dư ban đầu (${currency})`}
              </label>
              <input
                id="wallet-initial"
                name="initialBalance"
                type="number"
                inputMode="decimal"
                step="any"
                min={kind === 'credit' ? 0 : undefined}
                placeholder="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="field figure"
              />
            </div>
          </div>

          {kind === 'credit' && (
            <div>
              <label htmlFor="wallet-limit" className="label">
                Hạn mức thẻ ({currency})
              </label>
              <input
                id="wallet-limit"
                name="creditLimit"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                placeholder="Không bắt buộc"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="field figure"
              />
            </div>
          )}

          <IconPicker
            value={icon}
            onChange={(id) => {
              setIcon(id);
              if (id === 'PayPal') setColor(PAYPAL_BLUE);
            }}
          />

          <Swatches label="Màu nhận diện" colors={COLOR_OPTIONS} value={color} onChange={setColor} />

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              {kind === 'credit' ? 'Thêm thẻ' : 'Tạo nguồn tiền'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Sửa hoặc xóa nguồn tiền */}
      <Modal
        isOpen={Boolean(editingWallet)}
        onClose={() => setEditingWallet(null)}
        title="Sửa nguồn tiền"
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
              {editingWallet?.kind === 'credit' ? 'Dư nợ ban đầu' : 'Số dư đầu kỳ'} ({editingWallet?.currency})
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

          {editingWallet?.kind === 'credit' && (
            <div>
              <label htmlFor="wallet-edit-limit" className="label">
                Hạn mức thẻ ({editingWallet.currency})
              </label>
              <input
                id="wallet-edit-limit"
                name="creditLimit"
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                placeholder="Không bắt buộc"
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value)}
                className="field figure"
              />
            </div>
          )}

          <IconPicker value={editIcon} onChange={setEditIcon} />
          <Swatches label="Màu nhận diện" colors={COLOR_OPTIONS} value={editColor} onChange={setEditColor} />

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingWallet(null)} className="flex-1">
              Hủy
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Lưu thay đổi
            </Button>
          </div>

          {/* Pay off the card: a transfer, never counted as spending */}
          {editingWallet?.kind === 'credit' && (
            <section aria-labelledby="pay-card-heading" className="rounded-control bg-paper-2 p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id="pay-card-heading" className="text-sm font-semibold text-ink">
                  Trả nợ thẻ
                </h3>
                <p className="figure text-sm font-bold text-expense">
                  {editingWallet.currentBalance < 0
                    ? `Đang nợ ${formatCurrency(-editingWallet.currentBalance, editingWallet.currency)}`
                    : 'Không còn nợ'}
                </p>
              </div>
              {payableFrom.length === 0 ? (
                <p className="text-sm text-muted">Thêm một ví tiền hoặc tài khoản ngân hàng để trả nợ từ đó.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pay-from" className="label">
                        Trả từ
                      </label>
                      <Select
                        id="pay-from"
                        value={payFrom}
                        onChange={setPayFrom}
                        options={payableFrom.map((w) => ({
                          value: w.id,
                          label: w.name,
                          hint: formatCurrency(w.currentBalance, w.currency),
                        }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="pay-amount" className="label">
                        Số tiền ({wallets.find((w) => w.id === payFrom)?.currency ?? editingWallet.currency})
                      </label>
                      <input
                        id="pay-amount"
                        name="payAmount"
                        type="number"
                        inputMode="decimal"
                        step="any"
                        min={0}
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="field figure"
                      />
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handlePayCard}
                    disabled={!payFrom || !(parseFloat(payAmount) > 0)}
                    className="w-full"
                  >
                    <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                    <span>Ghi nhận trả nợ</span>
                  </Button>
                </>
              )}
            </section>
          )}

          {/* Delete: asks once, and says what goes with it */}
          <div className="border-t border-rule pt-4">
            {confirmingDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-ink">
                  Xóa <span className="font-semibold">{editingWallet?.name}</span>
                  {editingTxCount > 0 ? ` và ${editingTxCount} giao dịch của ví này` : ''}? Không thể hoàn tác.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setConfirmingDelete(false)} className="flex-1">
                    Giữ lại
                  </Button>
                  <Button variant="danger" onClick={handleDelete} className="flex-1">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>Xóa hẳn</span>
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmingDelete(true)} className="w-full">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span>Xóa nguồn tiền</span>
              </Button>
            )}
          </div>
        </form>
      </Modal>
    </Card>
  );
};
