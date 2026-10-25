import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { Plus } from 'lucide-react';
import { ColorTile } from './Swatches';
import { cn } from '../../utils/cn';
import { formatCurrency } from '../../utils/formatters';

const tileGridVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const tileVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

/** Three-across grid used by wallets and categories */
export const TileGrid: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <motion.ul
    aria-label={label}
    className="grid grid-cols-3 gap-2 sm:gap-3"
    variants={tileGridVariants}
    initial="hidden"
    animate="show"
  >
    {children}
  </motion.ul>
);

/** One record: its icon on top, the name, then the amount. Tapping opens its edit form. */
export const GridTile: React.FC<{
  color?: string;
  icon: React.ReactNode;
  name: string;
  amount: string;
  sub?: string;
  muted?: boolean;
  progress?: { spent: number; budget: number };
  /** Money owed (a credit card): the amount reads in the expense colour */
  debt?: boolean;
  onClick: () => void;
  editLabel: string;
}> = ({ color, icon, name, amount, sub, muted, progress, debt, onClick, editLabel }) => {
  const progressRatio = progress?.budget ? progress.spent / progress.budget : 0;
  const progressPercent = Math.max(0, Math.round(progressRatio * 100));
  const fillScale = Math.max(0, Math.min(progressRatio, 1));

  return (
    <motion.li className="min-w-0" variants={tileVariants}>
      <button
        type="button"
        onClick={onClick}
        aria-label={`${editLabel}: ${name}, ${amount}${progress ? `, ${progressPercent}% ngân sách` : ''}`}
        className="flex h-full w-full flex-col items-center gap-1.5 rounded-control border border-rule bg-paper-2 px-1.5 py-3 text-center transition-colors hover:border-rule-strong hover:bg-paper-3"
      >
        <ColorTile color={color} size="lg">
          {icon}
        </ColorTile>
        <span className="line-clamp-2 min-h-[2lh] w-full break-words text-xs font-semibold leading-tight text-ink sm:text-sm">
          {name}
        </span>
        <span
          className={cn(
            'figure w-full break-words text-xs font-bold leading-tight sm:text-sm',
            debt ? 'text-expense' : muted ? 'text-muted' : 'text-ink'
          )}
        >
          {amount}
        </span>
        {progress ? (
          <span className="w-full">
            <span className="block h-1 w-full overflow-hidden rounded-full bg-paper-3">
              <span
                className={cn(
                  'block h-full w-full origin-left rounded-full',
                  progressRatio > 1 ? 'bg-expense' : progressRatio >= 0.8 ? 'bg-warn' : 'bg-income'
                )}
                style={{ transform: `scaleX(${fillScale})` }}
              />
            </span>
            <span
              className={cn(
                'figure mt-1 block w-full text-[11px] leading-tight tabular-nums',
                progress.spent > progress.budget ? 'text-expense' : 'text-muted'
              )}
            >
              {progress.spent > progress.budget
                ? `vượt ${formatCurrency(progress.spent - progress.budget, 'VND')}`
                : `còn ${formatCurrency(progress.budget - progress.spent, 'VND')}`}
            </span>
          </span>
        ) : null}
        {sub ? <span className="figure w-full break-words text-[11px] leading-tight text-muted">{sub}</span> : null}
      </button>
    </motion.li>
  );
};

/** The dashed "+" tile that closes each grid */
export const AddTile: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <motion.li className="min-w-0" variants={tileVariants}>
    <button
      type="button"
      onClick={onClick}
      className="flex h-full min-h-[132px] w-full flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-rule-strong px-1.5 py-3 text-center text-muted transition-colors hover:border-accent hover:text-accent"
    >
      <span className="grid h-12 w-12 place-items-center rounded-card bg-paper-3" aria-hidden="true">
        <Plus className="h-6 w-6" />
      </span>
      <span className="text-xs font-semibold sm:text-sm">{label}</span>
    </button>
  </motion.li>
);
