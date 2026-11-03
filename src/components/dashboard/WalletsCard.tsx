import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { MoneyInput } from '../ui/MoneyInput';
import { Swatches } from '../ui/Swatches';
import { TileGrid, GridTile, AddTile } from '../ui/GridTile';
import { PaypalIcon, PAYPAL_BLUE } from '../ui/BrandIcon';
import type { CurrencyCode, Wallet } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { convertForWallet, getCurrencyOptions } from '../../services/currency';
import { Select } from '../ui/Select';
import { CARD_ART } from '../../assets/cards';
import { cn } from '../../utils/cn';
import { toLocalISODate } from '../../utils/date';
import { Tooltip } from '../ui/Tooltip';

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
    <div role="radiogroup" aria-label="Biểu tượng" className="grid grid-cols-5 gap-1.5">
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
              'flex flex-col items-center justify-center gap-0.5 h-14 min-w-0 rounded-control border px-0.5 text-[11px] font-semibold leading-tight transition-colors',
              isSelected ? 'border-accent bg-accent-soft text-ink' : 'border-rule-strong text-muted hover:text-ink hover:bg-paper-2'
            )}
          >
            <IconComponent className="w-5 h-5" aria-hidden="true" />
            <span className="max-w-full truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  </fieldset>
);

export const WalletsCard: React.FC = () => {
  const {
    wallets,
    transactions,
    addWallet,
    updateWallet,
    deleteWallet,
    addTransfer,
    previewTransferAmount,
    exchangeRates,
  } = useWallet();

  // State for Add Wallet Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [kind, setKind] = useState<'cash' | 'credit'>('cash');
  const [creditLimit, setCreditLimit] = useState('');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('VND');
  const [initialBalance, setInitialBalance] = useState('');
  const [color, setColor] = useState('#f97316');
  const [icon, setIcon] = useState('Wallet');

  // State for transfers between the owner's wallets
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferReceived, setTransferReceived] = useState('');
  const [receivedEdited, setReceivedEdited] = useState(false);
  const [transferFee, setTransferFee] = useState('');
  const [transferDate, setTransferDate] = useState(toLocalISODate());
  const [transferNote, setTransferNote] = useState('');

  // State for Edit Wallet Modal: name, balance, icon, colour, limit
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [editName, setEditName] = useState('');
  const [editCurrentBalance, setEditCurrentBalance] = useState('');
  const [editInitialBalance, setEditInitialBalance] = useState('');
  const [showInitialBalance, setShowInitialBalance] = useState(false);
  const [editIcon, setEditIcon] = useState('Wallet');
  const [editColor, setEditColor] = useState('#f97316');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editLimit, setEditLimit] = useState('');
  const [payFrom, setPayFrom] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payFee, setPayFee] = useState('');

  const transferSource = wallets.find((wallet) => wallet.id === transferFrom);
  const transferDestination = wallets.find((wallet) => wallet.id === transferTo);

  useEffect(() => {
    if (receivedEdited) return;

    const amount = parseFloat(transferAmount);
    if (!transferFrom || !transferTo || !(amount > 0)) {
      setTransferReceived('');
      return;
    }

    setTransferReceived(String(previewTransferAmount(transferFrom, transferTo, amount)));
  }, [previewTransferAmount, receivedEdited, transferAmount, transferFrom, transferTo]);

  const resetTransferForm = () => {
    const source = wallets.find((wallet) => wallet.kind !== 'credit') ?? wallets[0];
    const destination = wallets.find((wallet) => wallet.id !== source?.id);
    setTransferFrom(source?.id ?? '');
    setTransferTo(destination?.id ?? '');
    setTransferAmount('');
    setTransferReceived('');
    setReceivedEdited(false);
    setTransferFee('');
    setTransferDate(toLocalISODate());
    setTransferNote('');
  };

  const openTransferModal = () => {
    resetTransferForm();
    setIsTransferModalOpen(true);
  };

  const closeTransferModal = () => {
    setIsTransferModalOpen(false);
    resetTransferForm();
  };

  const handleTransfer = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = parseFloat(transferAmount);
    const received = parseFloat(transferReceived);
    const fee = parseFloat(transferFee);
    if (!transferFrom || !transferTo || !(amount > 0)) return;

    addTransfer(transferFrom, transferTo, amount, {
      toAmount: receivedEdited && received > 0 ? received : undefined,
      fee: fee > 0 ? fee : undefined,
      date: transferDate,
      note: transferNote.trim() || undefined,
    });
    closeTransferModal();
    navigator.vibrate?.(10);
  };

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

  const roundBalance = useCallback((val: number, curr?: string) => {
    if (!curr || curr === 'VND' || curr === 'JPY' || curr === 'KRW') {
      return Math.round(val);
    }
    return Math.round(val * 100) / 100;
  }, []);

  const netTransactions = useMemo(() => {
    if (!editingWallet) return 0;
    let sum = 0;
    for (const tx of transactions) {
      if (tx.walletId === editingWallet.id) {
        const amount = Number(tx.walletAmount ?? tx.amount) || 0;
        if (tx.type === 'income') sum += amount;
        else if (tx.type === 'expense') sum -= amount;
        else if (tx.type === 'transfer') sum -= amount;
      }
      if (tx.type === 'transfer' && tx.toWalletId === editingWallet.id) {
        sum += Number(tx.toAmount ?? tx.amount) || 0;
      }
    }
    return sum;
  }, [editingWallet, transactions]);

  const editingTxCount = useMemo(() => {
    if (!editingWallet) return 0;
    return transactions.filter(
      (t) => t.walletId === editingWallet.id || (t.type === 'transfer' && t.toWalletId === editingWallet.id)
    ).length;
  }, [editingWallet, transactions]);

  const startEdit = (wallet: Wallet) => {
    const isCard = wallet.kind === 'credit';
    setEditingWallet(wallet);
    setEditName(wallet.name);

    // Current balance or debt:
    const currentVal = isCard ? Math.max(0, -wallet.currentBalance) : wallet.currentBalance;
    setEditCurrentBalance(String(roundBalance(currentVal, wallet.currency)));

    // Opening balance or debt:
    const initialVal = isCard ? Math.abs(wallet.initialBalance) : wallet.initialBalance;
    setEditInitialBalance(String(roundBalance(initialVal, wallet.currency)));

    setShowInitialBalance(false);
    setEditLimit(wallet.creditLimit ? String(wallet.creditLimit) : '');
    setEditIcon(wallet.icon);
    setEditColor(wallet.color);
    setConfirmingDelete(false);
    setPayFrom(wallets.find((w) => w.kind !== 'credit' && w.id !== wallet.id)?.id ?? '');
    setPayAmount(isCard && wallet.currentBalance < 0 ? String(-wallet.currentBalance) : '');
    setPayFee('');
  };

  const handleCurrentBalanceChange = (raw: string) => {
    setEditCurrentBalance(raw);
    if (!editingWallet) return;
    const isCard = editingWallet.kind === 'credit';
    if (raw === '' || raw === '-') return;

    const val = parseFloat(raw);
    if (!Number.isFinite(val)) return;

    if (isCard) {
      const targetInitial = -val - netTransactions;
      const initialDebt = Math.max(0, -targetInitial);
      setEditInitialBalance(String(roundBalance(initialDebt, editingWallet.currency)));
    } else {
      const targetInitial = val - netTransactions;
      setEditInitialBalance(String(roundBalance(targetInitial, editingWallet.currency)));
    }
  };

  const handleInitialBalanceChange = (raw: string) => {
    setEditInitialBalance(raw);
    if (!editingWallet) return;
    const isCard = editingWallet.kind === 'credit';
    if (raw === '' || raw === '-') return;

    const val = parseFloat(raw);
    if (!Number.isFinite(val)) return;

    if (isCard) {
      const targetCurrent = -val + netTransactions;
      const currentDebt = Math.max(0, -targetCurrent);
      setEditCurrentBalance(String(roundBalance(currentDebt, editingWallet.currency)));
    } else {
      const targetCurrent = val + netTransactions;
      setEditCurrentBalance(String(roundBalance(targetCurrent, editingWallet.currency)));
    }
  };

  const handleUpdateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWallet || !editName.trim()) return;
    const isCard = editingWallet.kind === 'credit';
    const limit = parseFloat(editLimit);

    let finalInitialBalance = 0;
    if (editingTxCount === 0) {
      const currentVal = parseFloat(editCurrentBalance);
      const val = Number.isFinite(currentVal) ? currentVal : parseFloat(editInitialBalance) || 0;
      finalInitialBalance = isCard ? -Math.abs(val) : val;
    } else {
      const currentVal = parseFloat(editCurrentBalance);
      if (Number.isFinite(currentVal)) {
        finalInitialBalance = isCard
          ? -Math.abs(currentVal) - netTransactions
          : currentVal - netTransactions;
      } else {
        const initialVal = parseFloat(editInitialBalance) || 0;
        finalInitialBalance = isCard ? -Math.abs(initialVal) : initialVal;
      }
    }

    finalInitialBalance = roundBalance(finalInitialBalance, editingWallet.currency);

    updateWallet(editingWallet.id, {
      name: editName.trim().slice(0, 60),
      initialBalance: finalInitialBalance,
      creditLimit: isCard && limit > 0 ? limit : undefined,
      icon: editIcon,
      color: editColor,
    });

    setEditingWallet(null);
  };

  // Paying off a card: a transfer from one of your other wallets
  const payableFrom = wallets.filter((w) => w.kind !== 'credit' && w.id !== editingWallet?.id);
  const handlePayCard = () => {
    const amount = parseFloat(payAmount);
    const fee = parseFloat(payFee);
    if (!editingWallet || !payFrom || !(amount > 0)) return;
    addTransfer(payFrom, editingWallet.id, amount, { fee: fee > 0 ? fee : undefined });
    setEditingWallet(null);
  };

  const handleDelete = () => {
    if (!editingWallet) return;
    deleteWallet(editingWallet.id);
    setEditingWallet(null);
  };

  const currencyOptions = useMemo(() => getCurrencyOptions(exchangeRates), [exchangeRates]);

  return (
    <Card aria-labelledby="wallets-heading" className="flex flex-col">
      <CardHeader
        id="wallets-heading"
        title="Nguồn tiền"
        art={CARD_ART.wallets}
        action={
          wallets.length >= 2 ? (
            <Tooltip content="Chuyển tiền giữa các nguồn tiền">
              <Button type="button" variant="outline" size="icon" onClick={openTransferModal} aria-label="Chuyển tiền">
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </Tooltip>
          ) : undefined
        }
      />

      <TileGrid label="Nguồn tiền">
        {wallets.map((wallet) => {
          const { amountVnd } = convertForWallet(wallet.currentBalance, wallet, exchangeRates);
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
                  ? formatCurrency(left, wallet.currency)
                  : wallet.currency !== 'VND'
                    ? `≈ ${formatCurrency(Math.abs(amountVnd), 'VND')}`
                    : undefined
              }
              subTone={left !== null ? 'income' : undefined}
              onClick={() => startEdit(wallet)}
              editLabel={isCard ? 'Thẻ tín dụng' : 'Sửa nguồn tiền'}
            />
          );
        })}
        <AddTile label="Thêm ví" onClick={() => setIsAddModalOpen(true)} />
      </TileGrid>

      <Modal isOpen={isTransferModalOpen} onClose={closeTransferModal} title="Chuyển tiền">
        {/* Two fields per row; the rate hint, note and actions span the full width */}
        <form onSubmit={handleTransfer} className="grid grid-cols-2 gap-x-3 gap-y-4">
          <div className="min-w-0">
            <label htmlFor="transfer-from" className="label">
              Từ ví
            </label>
            <Select
              id="transfer-from"
              value={transferFrom}
              options={wallets.map((wallet) => ({
                value: wallet.id,
                label: wallet.name,
                hint: formatCurrency(wallet.currentBalance, wallet.currency),
              }))}
              onChange={(value) => {
                setTransferFrom(value);
                setReceivedEdited(false);
                if (value === transferTo) {
                  setTransferTo(wallets.find((wallet) => wallet.id !== value)?.id ?? '');
                }
              }}
              searchable
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="transfer-to" className="label">
              Đến ví
            </label>
            <Select
              id="transfer-to"
              value={transferTo}
              options={wallets
                .filter((wallet) => wallet.id !== transferFrom)
                .map((wallet) => ({
                  value: wallet.id,
                  label: wallet.name,
                  hint: formatCurrency(wallet.currentBalance, wallet.currency),
                }))}
              onChange={(value) => {
                setTransferTo(value);
                setReceivedEdited(false);
              }}
              searchable
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="transfer-amount" className="label truncate">
              Số tiền gửi ({transferSource?.currency ?? ''})
            </label>
            <MoneyInput
              id="transfer-amount"
              name="transferAmount"
              value={transferAmount}
              currency={transferSource?.currency}
              onValueChange={setTransferAmount}
              className="field figure"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="transfer-received" className="label truncate">
              Số tiền nhận ({transferDestination?.currency ?? ''})
            </label>
            <MoneyInput
              id="transfer-received"
              name="transferReceived"
              value={transferReceived}
              currency={transferDestination?.currency}
              onValueChange={(raw) => {
                setTransferReceived(raw);
                setReceivedEdited(true);
              }}
              className="field figure"
            />
          </div>

          {transferSource &&
            transferDestination &&
            transferSource.currency !== transferDestination.currency &&
            parseFloat(transferAmount) > 0 &&
            parseFloat(transferReceived) > 0 && (
              <p className="col-span-2 -mt-2 figure text-xs text-muted">
                1 {transferSource.currency} ={' '}
                {formatCurrency(
                  parseFloat(transferReceived) / parseFloat(transferAmount),
                  transferDestination.currency
                )}
              </p>
            )}

          <div className="min-w-0">
            <label htmlFor="transfer-fee" className="label truncate">
              Phí ({transferSource?.currency ?? ''})
            </label>
            <MoneyInput
              id="transfer-fee"
              name="transferFee"
              placeholder="0"
              value={transferFee}
              currency={transferSource?.currency}
              onValueChange={setTransferFee}
              className="field figure"
            />
          </div>

          <div className="min-w-0">
            <label htmlFor="transfer-date" className="label">
              Ngày
            </label>
            <input
              id="transfer-date"
              name="transferDate"
              type="date"
              required
              value={transferDate}
              onChange={(event) => setTransferDate(event.target.value)}
              className="field"
            />
          </div>

          <div className="col-span-2">
            <label htmlFor="transfer-note" className="label">
              Ghi chú
            </label>
            <input
              id="transfer-note"
              name="transferNote"
              type="text"
              value={transferNote}
              onChange={(event) => setTransferNote(event.target.value)}
              className="field"
            />
          </div>

          <div className="col-span-2 flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeTransferModal} className="flex-1">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!transferFrom || !transferTo || !(parseFloat(transferAmount) > 0)}
              className="flex-1"
            >
              Chuyển
            </Button>
          </div>
        </form>
      </Modal>

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
              <MoneyInput
                id="wallet-initial"
                name="initialBalance"
                placeholder="0"
                value={initialBalance}
                currency={currency}
                allowNegative={kind !== 'credit'}
                onValueChange={setInitialBalance}
                className="field figure"
              />
            </div>
          </div>

          {kind === 'credit' && (
            <div>
              <label htmlFor="wallet-limit" className="label">
                Hạn mức thẻ ({currency})
              </label>
              <MoneyInput
                id="wallet-limit"
                name="creditLimit"
                placeholder="Không bắt buộc"
                value={creditLimit}
                currency={currency}
                onValueChange={setCreditLimit}
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
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="flex-1">
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
        <form onSubmit={handleUpdateWallet} className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-3">
              <div className="min-w-0">
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

              <div className="min-w-0">
                <label htmlFor="wallet-edit-balance" className="label truncate">
                  {editingWallet?.kind === 'credit'
                    ? 'Dư nợ hiện tại'
                    : editingTxCount > 0
                      ? 'Số dư hiện tại'
                      : 'Số dư'} ({editingWallet?.currency})
                </label>
                <MoneyInput
                  id="wallet-edit-balance"
                  name="currentBalance"
                  required
                  value={editCurrentBalance}
                  currency={editingWallet?.currency}
                  allowNegative={editingWallet?.kind !== 'credit'}
                  onValueChange={handleCurrentBalanceChange}
                  className="field figure font-semibold"
                />
              </div>
            </div>

            {editingTxCount > 0 && (
              <div className="rounded-control bg-paper-2 p-2.5 text-xs text-muted space-y-2 border border-rule">
                <div className="flex items-center justify-between">
                  <span>
                    Đã có <strong className="text-ink">{editingTxCount}</strong> giao dịch (
                    <span className={netTransactions >= 0 ? 'text-income font-medium' : 'text-expense font-medium'}>
                      {netTransactions >= 0 ? '+' : ''}{formatCurrency(netTransactions, editingWallet?.currency ?? 'VND')}
                    </span>
                    )
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowInitialBalance((v) => !v)}
                    className="text-accent hover:underline font-medium text-xs ml-2 cursor-pointer"
                  >
                    {showInitialBalance ? 'Ẩn số dư ban đầu' : 'Sửa số dư ban đầu'}
                  </button>
                </div>
                {showInitialBalance && (
                  <div className="pt-2 border-t border-rule space-y-1">
                    <label htmlFor="wallet-edit-initial" className="label text-xs">
                      {editingWallet?.kind === 'credit'
                        ? 'Dư nợ ban đầu (lúc tạo thẻ)'
                        : 'Số dư ban đầu (lúc tạo ví)'} ({editingWallet?.currency})
                    </label>
                    <MoneyInput
                      id="wallet-edit-initial"
                      name="initialBalance"
                      value={editInitialBalance}
                      currency={editingWallet?.currency}
                      allowNegative={editingWallet?.kind !== 'credit'}
                      onValueChange={handleInitialBalanceChange}
                      className="field figure text-sm"
                    />
                    <p className="text-[11px] text-muted">
                      Số dư hiện tại và số dư ban đầu được tự động đồng bộ theo các giao dịch đã ghi nhận.
                    </p>
                  </div>
                )}
              </div>
            )}

            {editingWallet?.kind === 'credit' && (
              <div>
                <label htmlFor="wallet-edit-limit" className="label">
                  Hạn mức thẻ ({editingWallet.currency})
                </label>
                <MoneyInput
                  id="wallet-edit-limit"
                  name="creditLimit"
                  placeholder="Không bắt buộc"
                  value={editLimit}
                  currency={editingWallet?.currency}
                  onValueChange={setEditLimit}
                  className="field figure"
                />
              </div>
            )}
          </div>

          <IconPicker value={editIcon} onChange={setEditIcon} />
          <Swatches label="Màu nhận diện" colors={COLOR_OPTIONS} value={editColor} onChange={setEditColor} />

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingWallet(null)} className="flex-1">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
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
                      <MoneyInput
                        id="pay-amount"
                        name="payAmount"
                        value={payAmount}
                        currency={wallets.find((w) => w.id === payFrom)?.currency ?? editingWallet.currency}
                        onValueChange={setPayAmount}
                        className="field figure"
                      />
                    </div>
                    <div>
                      <label htmlFor="pay-fee" className="label">
                        Phí ({wallets.find((w) => w.id === payFrom)?.currency ?? editingWallet.currency})
                      </label>
                      <MoneyInput
                        id="pay-fee"
                        name="payFee"
                        placeholder="0"
                        value={payFee}
                        currency={wallets.find((w) => w.id === payFrom)?.currency ?? editingWallet.currency}
                        onValueChange={setPayFee}
                        className="field figure"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
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
          <div className="border-t border-rule pt-3">
            {confirmingDelete ? (
              <div className="space-y-3">
                <p className="text-sm text-ink">
                  Xóa <span className="font-semibold">{editingWallet?.name}</span>
                  {editingTxCount > 0 ? ` và ${editingTxCount} giao dịch của ví này` : ''}? Không thể hoàn tác.
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)} className="flex-1">
                    Giữ lại
                  </Button>
                  <Button type="button" variant="danger" onClick={handleDelete} className="flex-1">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span>Xóa hẳn</span>
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(true)} className="w-full text-expense">
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
