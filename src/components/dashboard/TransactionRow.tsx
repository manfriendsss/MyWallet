import React, { useRef, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';
import type { Category, Transaction, Wallet } from '../../types';
import { formatCurrency, formatShortDate, formatSigned } from '../../utils/formatters';
import { IconRenderer } from '../ui/IconRenderer';
import { ColorTile } from '../ui/Swatches';
import { Tooltip } from '../ui/Tooltip';

interface TransactionRowProps {
  tx: Transaction;
  category?: Category;
  wallet?: Wallet;
  /** Transfers only: where the money went */
  toWallet?: Wallet;
  showDate?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (tx: Transaction) => void;
  onOpen?: (tx: Transaction) => void;
  index?: number;
}

/** One ledger line with touch actions tucked behind its content. */
export const TransactionRow: React.FC<TransactionRowProps> = ({
  tx,
  category,
  wallet,
  toWallet,
  showDate = true,
  onDelete,
  onEdit,
  onOpen,
  index,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const isForeign = tx.currency !== 'VND';
  const title = tx.note || category?.name || (isTransfer ? 'Chuyển tiền' : 'Giao dịch');
  const tone = isTransfer ? 'text-ink-2' : isIncome ? 'text-income' : 'text-expense';
  const amount = isTransfer
    ? formatCurrency(tx.amount, tx.currency)
    : formatSigned(tx.amount, tx.currency, isIncome ? '+' : '−');
  const from = wallet?.name ?? 'Ví đã xóa';
  const where = isTransfer ? `${from} → ${toWallet?.name ?? 'Ví đã xóa'}` : from;
  const meta = [where, showDate ? formatShortDate(tx.date) : null, tx.time].filter(Boolean).join(', ');
  const canSwipe = Boolean(onEdit || onDelete);

  // A swipe ends with a click on the row; that click must not open the edit form
  const draggedAt = useRef(0);

  const handleBodyClick = () => {
    if (Date.now() - draggedAt.current < 350) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    onOpen?.(tx);
  };

  const handleDelete = () => {
    setIsOpen(false);
    navigator.vibrate?.(15);
    onDelete?.(tx.id);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 4) draggedAt.current = Date.now();
    setIsOpen(info.offset.x < -56);
  };

  return (
    <motion.li
      className="relative overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index ?? 0, 10) * 0.035 }}
    >
      {canSwipe && (
        <div className="absolute inset-y-0 right-0 flex items-stretch" aria-hidden={!isOpen}>
          {onEdit && (
            <button
              type="button"
              tabIndex={isOpen ? 0 : -1}
              aria-label={`Sửa ${title}`}
              onClick={() => {
                setIsOpen(false);
                onEdit(tx);
              }}
              className="flex w-16 flex-col items-center justify-center gap-1 bg-accent text-xs font-semibold text-accent-ink"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Sửa
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              tabIndex={isOpen ? 0 : -1}
              aria-label={`Xóa ${title}`}
              onClick={handleDelete}
              className="flex w-16 flex-col items-center justify-center gap-1 bg-expense text-xs font-semibold text-accent-ink"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Xóa
            </button>
          )}
        </div>
      )}

      <motion.div
        drag={canSwipe ? 'x' : false}
        dragConstraints={{ left: -132, right: 0 }}
        dragElastic={0.08}
        dragDirectionLock
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen ? -132 : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        className="relative flex items-center gap-3 bg-surface py-3"
      >
        <button
          type="button"
          onClick={handleBodyClick}
          disabled={!onOpen}
          aria-label={onOpen ? `Xem chi tiết ${title}` : title}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          {isTransfer ? (
            <ColorTile color={toWallet?.color}>
              <ArrowLeftRight className="h-[18px] w-[18px]" />
            </ColorTile>
          ) : (
            <ColorTile color={category?.color}>
              <IconRenderer name={category?.icon || 'CircleDot'} className="h-[18px] w-[18px]" />
            </ColorTile>
          )}

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <span className="truncate">{title}</span>
            </span>
            <span className="figure mt-0.5 block truncate text-xs text-muted">{meta}</span>
          </span>

          <span className="shrink-0 text-right">
            <span className={`figure block text-sm font-bold ${tone}`}>{amount}</span>
            {isForeign && (
              <span className="figure block text-xs text-muted">≈ {formatCurrency(tx.amountVnd, 'VND')}</span>
            )}
          </span>
        </button>

        {onDelete && (
          <Tooltip content='Xóa giao dịch'>
            <button
              type="button"
              onClick={handleDelete}
              className="-mr-2 hidden h-10 w-10 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-expense-soft hover:text-expense sm:grid"
              aria-label={`Xóa ${title}`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </Tooltip>
        )}
      </motion.div>
    </motion.li>
  );
};
