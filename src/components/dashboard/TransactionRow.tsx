import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Trash2 } from 'lucide-react';
import type { Category, Transaction, Wallet } from '../../types';
import { IconRenderer } from '../ui/IconRenderer';
import { ColorTile } from '../ui/Swatches';
import { formatCurrency, formatShortDate } from '../../utils/formatters';

interface TransactionRowProps {
  tx: Transaction;
  category?: Category;
  wallet?: Wallet;
  /** Transfers only: where the money went */
  toWallet?: Wallet;
  showDate?: boolean;
  onDelete?: (id: string) => void;
  index?: number;
}

/** One ledger line. Delete asks once, inline, and the question clears itself after a few seconds. */
export const TransactionRow: React.FC<TransactionRowProps> = ({
  tx,
  category,
  wallet,
  toWallet,
  showDate = true,
  onDelete,
  index,
}) => {
  const [confirming, setConfirming] = useState(false);
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const isForeign = tx.currency !== 'VND';
  const title = tx.note || category?.name || (isTransfer ? 'Chuyển tiền' : 'Giao dịch');
  const sign = isTransfer ? '' : isIncome ? '+' : '−';
  const tone = isTransfer ? 'text-ink-2' : isIncome ? 'text-income' : 'text-expense';

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  const from = wallet?.name ?? 'Ví đã xóa';
  const where = isTransfer ? `${from} → ${toWallet?.name ?? 'Ví đã xóa'}` : from;
  const meta = [where, showDate ? formatShortDate(tx.date) : null, tx.time].filter(Boolean).join(', ');

  return (
    <motion.li
      className="flex items-center gap-3 py-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index ?? 0, 10) * 0.035 }}
    >
      {isTransfer ? (
        <ColorTile color={toWallet?.color}>
          <ArrowLeftRight className="w-[18px] h-[18px]" />
        </ColorTile>
      ) : (
        <ColorTile color={category?.color}>
          <IconRenderer name={category?.icon || 'CircleDot'} className="w-[18px] h-[18px]" />
        </ColorTile>
      )}

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <span className="truncate">{title}</span>
          {tx.isAiGenerated && (
            <span title="Tạo bởi trợ lý AI" className="shrink-0 rounded-chip bg-paper-3 px-1.5 text-xs font-semibold text-muted">
              AI
            </span>
          )}
        </p>
        <p className="figure mt-0.5 truncate text-xs text-muted">{meta}</p>
      </div>

      <div className="text-right">
        <p className={`figure text-sm font-bold ${tone}`}>{`${sign}${formatCurrency(tx.amount, tx.currency)}`}</p>
        {isForeign && (
          <p className="figure text-xs text-muted">{`≈ ${formatCurrency(tx.amountVnd, 'VND')}`}</p>
        )}
      </div>

      {onDelete &&
        (confirming ? (
          <button
            type="button"
            onClick={() => onDelete(tx.id)}
            className="h-8 shrink-0 rounded-control border border-rule-strong px-2.5 text-xs font-semibold text-expense hover:bg-expense-soft transition-colors"
            aria-label={`Xác nhận xóa ${title}`}
          >
            Xóa?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="-mr-2 grid h-10 w-8 sm:w-10 shrink-0 place-items-center rounded-control text-muted hover:bg-expense-soft hover:text-expense transition-colors"
            aria-label={`Xóa ${title}`}
            title="Xóa giao dịch"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        ))}
    </motion.li>
  );
};
