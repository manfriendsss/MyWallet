import React from 'react';
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUp,
  CalendarDays,
  Clock3,
  Image as ImageIcon,
  Pencil,
} from 'lucide-react';
import type { Category, Transaction, Wallet } from '../../types';
import { receiptApi } from '../../services/api';
import { formatCurrency, formatShortDate, formatSigned } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { IconRenderer } from '../ui/IconRenderer';
import { Modal } from '../ui/Modal';
import { ColorTile } from '../ui/Swatches';

interface TransactionDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  transaction?: Transaction;
  category?: Category;
  wallet?: Wallet;
  toWallet?: Wallet;
}

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  tile?: React.ReactNode;
}> = ({ icon, label, children, tile }) => (
  <div className="flex min-h-[4.25rem] min-w-0 items-center gap-2.5 rounded-control bg-paper-2 px-2.5 py-2.5">
    {tile ?? (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-chip bg-surface text-muted">
        {icon}
      </span>
    )}
    <div className="min-w-0 flex-1">
      <dt className="truncate text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{children}</dd>
    </div>
  </div>
);

export const TransactionDetailSheet: React.FC<TransactionDetailSheetProps> = ({
  isOpen,
  onClose,
  onEdit,
  transaction,
  category,
  wallet,
  toWallet,
}) => {
  if (!transaction) {
    return <Modal isOpen={false} onClose={onClose}><span /></Modal>;
  }

  const isIncome = transaction.type === 'income';
  const isTransfer = transaction.type === 'transfer';
  const title = transaction.note || category?.name || (isTransfer ? 'Chuyển tiền' : 'Giao dịch');
  const amount = isTransfer
    ? formatCurrency(transaction.amount, transaction.currency)
    : formatSigned(transaction.amount, transaction.currency, isIncome ? '+' : '−');
  const amountTone = isTransfer ? 'text-ink' : isIncome ? 'text-income' : 'text-expense';
  const typeLabel = isTransfer ? 'Chuyển tiền' : isIncome ? 'Thu nhập' : 'Chi tiêu';
  const HeroStatusIcon = isTransfer ? ArrowLeftRight : isIncome ? ArrowUp : ArrowDown;
  const heroStatusTone = isTransfer ? 'text-muted' : isIncome ? 'text-income' : 'text-expense';

  const heroTile = isTransfer ? (
    <ColorTile color={toWallet?.color ?? wallet?.color} size="lg">
      <ArrowLeftRight className="h-6 w-6" />
    </ColorTile>
  ) : (
    <ColorTile color={category?.color} size="lg">
      <IconRenderer name={category?.icon || 'CircleDot'} className="h-6 w-6" />
    </ColorTile>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={typeLabel} maxWidth="max-w-md">
      <div className="space-y-4">
        <div
          className={cn(
            'flex items-center gap-4 rounded-card border bg-paper-2 p-4',
            isTransfer
              ? 'border-rule'
              : isIncome
                ? 'border-income shadow-[0_0_18px_-10px_var(--color-income)]'
                : 'border-expense shadow-[0_0_18px_-10px_var(--color-expense)]'
          )}
        >
          {heroTile}
          <div className="min-w-0 flex-1">
            <p className={cn('figure text-2xl font-bold', amountTone)}>{amount}</p>
            {transaction.currency !== 'VND' && (
              <p className="figure mt-1 text-sm text-muted">≈ {formatCurrency(transaction.amountVnd, 'VND')}</p>
            )}
          </div>
          <HeroStatusIcon className={cn('h-8 w-8 shrink-0', heroStatusTone)} strokeWidth={2.25} aria-hidden="true" />
        </div>

        <dl className="grid grid-cols-2 gap-2">
          {!isTransfer && category && (
            <DetailRow
              icon={null}
              label="Danh mục"
              tile={(
                <ColorTile color={category.color} size="sm">
                  <IconRenderer name={category.icon} className="h-4 w-4" />
                </ColorTile>
              )}
            >
              {category.name}
            </DetailRow>
          )}

          <DetailRow
            icon={null}
            label={isTransfer ? 'Từ nguồn tiền' : 'Nguồn tiền'}
            tile={(
              <ColorTile color={wallet?.color} size="sm">
                <IconRenderer name={wallet?.icon || 'Wallet'} className="h-4 w-4" />
              </ColorTile>
            )}
          >
            {wallet?.name ?? 'Ví đã xóa'}
          </DetailRow>

          {isTransfer && (
            <DetailRow
              icon={null}
              label="Đến nguồn tiền"
              tile={(
                <ColorTile color={toWallet?.color} size="sm">
                  <IconRenderer name={toWallet?.icon || 'Wallet'} className="h-4 w-4" />
                </ColorTile>
              )}
            >
              {toWallet?.name ?? 'Ví đã xóa'}
            </DetailRow>
          )}

          <DetailRow icon={<CalendarDays className="h-[18px] w-[18px]" />} label="Ngày">
            {formatShortDate(transaction.date)}
          </DetailRow>

          {transaction.time && (
            <DetailRow icon={<Clock3 className="h-[18px] w-[18px]" />} label="Thời gian">
              {transaction.time}
            </DetailRow>
          )}

          {!isTransfer && wallet && transaction.walletAmount !== undefined && transaction.currency !== wallet.currency && (
            <DetailRow icon={<ArrowLeftRight className="h-[18px] w-[18px]" />} label="Quy đổi vào thẻ">
              {formatCurrency(transaction.walletAmount, wallet.currency)}
            </DetailRow>
          )}

          {isTransfer && transaction.toAmount !== undefined && toWallet && (
            <DetailRow icon={<ArrowDownLeft className="h-[18px] w-[18px]" />} label="Số tiền nhận">
              {formatCurrency(transaction.toAmount, toWallet.currency)}
            </DetailRow>
          )}
        </dl>

        {transaction.receiptKey && (
          <a
            href={receiptApi.url(transaction.receiptKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-card border border-rule bg-paper-2"
          >
            <img
              src={receiptApi.url(transaction.receiptKey)}
              alt="Ảnh hóa đơn của giao dịch"
              loading="lazy"
              className="max-h-52 w-full object-cover transition-transform group-hover:scale-[1.01]"
            />
            <span className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-ink">
              <ImageIcon className="h-4 w-4 text-muted" aria-hidden="true" />
              Xem ảnh hóa đơn
            </span>
          </a>
        )}

        <Button type="button" className="w-full" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Chỉnh sửa giao dịch
        </Button>
      </div>
    </Modal>
  );
};
