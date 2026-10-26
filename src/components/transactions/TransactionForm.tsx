import React, { useEffect, useMemo, useState } from 'react';
import type { Transaction, TransactionType } from '../../types';
import { useWallet } from '../../context/WalletContext';
import { toLocalISODate } from '../../utils/date';
import { receiptApi } from '../../services/api';
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
  const { wallets, categories, addTransaction, updateTransaction } = useWallet();
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(toLocalISODate());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const nextType = transaction?.type === 'income' ? 'income' : 'expense';
    setType(nextType);
    setAmount(transaction && transaction.type !== 'transfer' ? String(transaction.amount) : '');
    setWalletId(transaction?.walletId ?? wallets[0]?.id ?? '');
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

  if (transaction?.type === 'transfer') {
    const fromWallet = wallets.find((wallet) => wallet.id === transaction.walletId);
    const toWallet = wallets.find((wallet) => wallet.id === transaction.toWalletId);
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Sửa giao dịch">
        <div className="space-y-5">
          <p className="text-sm text-ink">
            {fromWallet?.name ?? 'Ví đã xóa'} → {toWallet?.name ?? 'Ví đã xóa'} ·{' '}
            <span className="font-bold">{formatCurrency(transaction.amount, transaction.currency)}</span>
          </p>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Đóng
          </Button>
        </div>
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
      currency: selectedWallet.currency,
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
            <span className="text-muted">{selectedWallet?.currency ?? ''}</span>
          </label>
          <MoneyInput
            id="transaction-amount"
            required
            value={amount}
            currency={selectedWallet?.currency}
            onValueChange={setAmount}
            className="field text-2xl"
          />
        </div>

        <div>
          <label htmlFor="transaction-wallet" className="label">Ví</label>
          <Select
            id="transaction-wallet"
            value={walletId}
            options={walletOptions}
            onChange={(value) => {
              setWalletId(value);
              setError('');
            }}
            searchable
          />
        </div>

        <fieldset>
          <legend className="label">Danh mục</legend>
          <div className="grid grid-cols-4 gap-2">
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
                  className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-control px-1.5 py-2 text-ink transition-shadow ${
                    selected ? 'ring-2 ring-accent' : 'hover:bg-paper-2'
                  }`}
                >
                  <ColorTile color={category.color} size="sm">
                    <IconRenderer name={category.icon} className="h-4 w-4" />
                  </ColorTile>
                  <span className="line-clamp-2 text-xs">{category.name}</span>
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
