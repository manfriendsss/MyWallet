import React, { useEffect, useMemo, useState } from 'react';
import type { Transaction, TransactionType } from '../../types';
import { useWallet } from '../../context/WalletContext';
import { toLocalISODate } from '../../utils/date';
import { receiptApi } from '../../services/api';
import { currencyName, getCurrencyOptions } from '../../services/currency';
import { formatCurrency } from '../../utils/formatters';
import { Button } from '../ui/Button';
import { MoneyInput } from '../ui/MoneyInput';
import { IconRenderer } from '../ui/IconRenderer';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { ColorTile } from '../ui/Swatches';
import { ToneTabs, type ToneTab } from '../ui/ToneTabs';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: Transaction;
}

const TYPE_TABS: Array<ToneTab<TransactionType>> = [
  { id: 'expense', label: 'Chi tiêu', tone: 'expense' },
  { id: 'income', label: 'Thu nhập', tone: 'income' },
];

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  transaction,
}) => {
  const { wallets, categories, exchangeRates, addTransaction, updateTransaction, previewTransferAmount } = useWallet();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('VND');
  const [walletId, setWalletId] = useState('');
  const [toWalletId, setToWalletId] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(toLocalISODate());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const nextType = transaction?.type === 'income' ? 'income' : 'expense';
    setType(nextType);
    setAmount(transaction ? String(transaction.amount) : '');
    setCurrency(transaction?.currency ?? wallets[0]?.currency ?? 'VND');
    setWalletId(transaction?.walletId ?? wallets[0]?.id ?? '');
    setToWalletId(transaction?.toWalletId ?? '');
    setToAmount(transaction?.toAmount !== undefined ? String(transaction.toAmount) : '');
    setCategoryId(
      transaction && transaction.type !== 'transfer'
        ? transaction.categoryId
        : categories.find((category) => category.type === nextType)?.id ?? ''
    );
    setDate(transaction?.date ?? toLocalISODate());
    setNote(transaction?.note ?? '');
    setError('');
    // Reset only when the form opens or targets another entry, never mid-typing when data syncs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transaction?.id]);

  const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
  const filteredCategories = categories.filter((category) => category.type === type);
  const walletOptions = useMemo(
    () => wallets.map((wallet) => ({ value: wallet.id, label: wallet.name, hint: wallet.currency })),
    [wallets]
  );
  const allCurrencyOptions = useMemo(() => getCurrencyOptions(exchangeRates), [exchangeRates]);
  const walletCurrencies = useMemo(() => new Set(wallets.map((wallet) => wallet.currency)), [wallets]);
  const currencyOptions = selectedWallet?.kind === 'credit'
    ? allCurrencyOptions
    : allCurrencyOptions.filter((option) => walletCurrencies.has(option.value));
  const isForeignCardPurchase = selectedWallet?.kind === 'credit' && currency !== selectedWallet.currency;

  if (transaction?.type === 'transfer') {
    const fromWallet = wallets.find((wallet) => wallet.id === transaction.walletId);
    const toWallet = wallets.find((wallet) => wallet.id === transaction.toWalletId);
    const selectedFromWallet = wallets.find((wallet) => wallet.id === walletId);
    const selectedToWallet = wallets.find((wallet) => wallet.id === toWalletId);
    const destinationOptions = walletOptions.filter((wallet) => wallet.value !== walletId);

    const handleTransferSubmit = (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const numericAmount = Number(amount);
      const numericToAmount = Number(toAmount);
      if (!selectedFromWallet || !selectedToWallet || selectedFromWallet.id === selectedToWallet.id || !(numericAmount > 0)) {
        setError('Vui lòng nhập số tiền và chọn hai nguồn tiền khác nhau.');
        return;
      }

      updateTransaction(transaction.id, {
        amount: numericAmount,
        currency: selectedFromWallet.currency,
        walletId: selectedFromWallet.id,
        toWalletId: selectedToWallet.id,
        toAmount: numericToAmount > 0
          ? numericToAmount
          : previewTransferAmount(selectedFromWallet.id, selectedToWallet.id, numericAmount),
        date,
        note: note.trim() || undefined,
      });
      navigator.vibrate?.(10);
      onClose();
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Sửa giao dịch"
        description={`${fromWallet?.name ?? 'Ví đã xóa'} → ${toWallet?.name ?? 'Ví đã xóa'}`}
      >
        <form className="space-y-4" onSubmit={handleTransferSubmit}>
          <div>
            <label htmlFor="transfer-amount" className="label flex items-center justify-between gap-3">
              <span>Số tiền chuyển</span>
              <span className="text-muted">{selectedFromWallet?.currency ?? ''}</span>
            </label>
            <MoneyInput
              id="transfer-amount"
              required
              value={amount}
              currency={selectedFromWallet?.currency}
              onValueChange={(value) => {
                setAmount(value);
                setError('');
              }}
              className="field text-2xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="transfer-from-wallet" className="label">Từ nguồn tiền</label>
              <Select
                id="transfer-from-wallet"
                value={walletId}
                options={walletOptions}
                onChange={(value) => {
                  setWalletId(value);
                  if (value === toWalletId) setToWalletId('');
                  setToAmount('');
                  setError('');
                }}
                searchable
              />
            </div>
            <div>
              <label htmlFor="transfer-to-wallet" className="label">Đến nguồn tiền</label>
              <Select
                id="transfer-to-wallet"
                value={toWalletId}
                options={destinationOptions}
                onChange={(value) => {
                  setToWalletId(value);
                  setToAmount('');
                  setError('');
                }}
                searchable
              />
            </div>
          </div>

          {selectedFromWallet && selectedToWallet && selectedFromWallet.currency !== selectedToWallet.currency && (
            <div>
              <label htmlFor="transfer-received" className="label flex items-center justify-between gap-3">
                <span>Số tiền thực nhận</span>
                <span className="text-muted">{selectedToWallet.currency}</span>
              </label>
              <MoneyInput
                id="transfer-received"
                value={toAmount}
                currency={selectedToWallet.currency}
                onValueChange={setToAmount}
                placeholder={formatCurrency(
                  previewTransferAmount(selectedFromWallet.id, selectedToWallet.id, Number(amount)),
                  selectedToWallet.currency
                )}
                className="field"
              />
              <p className="hint">Để trống để dùng tỷ giá hiện tại.</p>
            </div>
          )}

          <div>
            <label htmlFor="transfer-date" className="label">Ngày</label>
            <input
              id="transfer-date"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="field"
            />
          </div>

          <div>
            <label htmlFor="transfer-note" className="label">Ghi chú</label>
            <input
              id="transfer-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="field"
            />
          </div>

          {error && <p className="text-sm text-expense">{error}</p>}

          <Button type="submit" className="w-full">Lưu</Button>
        </form>
      </Modal>
    );
  }

  const handleTypeChange = (nextType: TransactionType) => {
    setType(nextType);
    setCategoryId(categories.find((category) => category.type === nextType)?.id ?? '');
    setError('');
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    const categoryIsValid = filteredCategories.some((category) => category.id === categoryId);
    if (!(numericAmount > 0) || !selectedWallet || !categoryIsValid) {
      setError('Vui lòng nhập số tiền, ví và danh mục hợp lệ.');
      return;
    }

    const values = {
      type,
      amount: numericAmount,
      currency,
      walletId: selectedWallet.id,
      categoryId,
      date,
      note: note.trim() || undefined,
    };

    if (transaction) {
      updateTransaction(transaction.id, values);
    } else {
      addTransaction(values);
    }
    navigator.vibrate?.(10);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={transaction ? 'Sửa giao dịch' : 'Thêm giao dịch'}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ToneTabs tabs={TYPE_TABS} value={type} onChange={handleTypeChange} label="Loại giao dịch" />

        <div>
          <label htmlFor="transaction-amount" className="label flex items-center justify-between gap-3">
            <span>Số tiền</span>
            <span className="text-muted">{currency}</span>
          </label>
          <MoneyInput
            id="transaction-amount"
            required
            value={amount}
            currency={currency}
            onValueChange={setAmount}
            className="field text-2xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label htmlFor="transaction-currency" className="label">Loại tiền</label>
            <Select
              id="transaction-currency"
              value={currency}
              options={currencyOptions}
              onChange={(value) => {
                if (selectedWallet?.kind === 'credit') {
                  setCurrency(value);
                } else {
                  const matchingWallet = wallets.find((wallet) => wallet.currency === value);
                  if (matchingWallet) {
                    setWalletId(matchingWallet.id);
                    setCurrency(value);
                  }
                }
                setError('');
              }}
              searchable
              searchPlaceholder="Tìm loại tiền…"
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="transaction-wallet" className="label">Nguồn tiền</label>
            <Select
              id="transaction-wallet"
              value={walletId}
              options={walletOptions}
              onChange={(value) => {
                setWalletId(value);
                const nextWallet = wallets.find((wallet) => wallet.id === value);
                if (nextWallet?.kind !== 'credit') setCurrency(nextWallet?.currency ?? 'VND');
                setError('');
              }}
              searchable
            />
          </div>
        </div>
        {isForeignCardPurchase && (
          <p className="hint -mt-2">
            Khoản {currencyName(currency)} này sẽ được quy đổi vào dư nợ {selectedWallet.currency} của thẻ.
          </p>
        )}

        <fieldset>
          <legend className="label">Danh mục</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {filteredCategories.map((category) => {
              const selected = category.id === categoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setCategoryId(category.id);
                    setError('');
                  }}
                  className={`flex h-24 w-full flex-col items-center justify-center gap-2 rounded-control px-2 py-2.5 text-ink transition-[background-color,box-shadow] ${
                    selected ? 'bg-paper-2 ring-2 ring-accent' : 'hover:bg-paper-2'
                  }`}
                >
                  <ColorTile color={category.color}>
                    <IconRenderer name={category.icon} className="h-[18px] w-[18px]" />
                  </ColorTile>
                  <span className="line-clamp-2 flex min-h-9 items-center text-center text-sm font-medium leading-tight">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="transaction-date" className="label">Ngày</label>
          <input
            id="transaction-date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="transaction-note" className="label">Ghi chú (không bắt buộc)</label>
          <input
            id="transaction-note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="field"
          />
        </div>

        {transaction?.receiptKey && (
          <a
            href={receiptApi.url(transaction.receiptKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-control border border-rule"
          >
            <img
              src={receiptApi.url(transaction.receiptKey)}
              alt="Ảnh hóa đơn của giao dịch"
              loading="lazy"
              className="max-h-56 w-full object-cover"
            />
          </a>
        )}

        {error && <p className="text-sm text-expense">{error}</p>}

        <Button type="submit" className="w-full">
          Lưu
        </Button>
      </form>
    </Modal>
  );
};
