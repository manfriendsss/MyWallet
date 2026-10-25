import React from 'react';
import { cn } from '../../utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'purple' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variants = {
    default: 'bg-paper-3 text-ink-2',
    success: 'bg-accent-soft text-income',
    danger: 'bg-expense-soft text-expense',
    warning: 'bg-paper-3 text-warn',
    purple: 'bg-paper-3 text-ink-2',
    outline: 'border border-rule-strong text-muted',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 h-5 rounded-chip text-xs font-semibold',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
