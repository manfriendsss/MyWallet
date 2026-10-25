import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'ai';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none rounded-control transition-[background-color,border-color,color,opacity] duration-150 disabled:opacity-55 disabled:cursor-not-allowed';

  const primary = 'bg-accent text-accent-ink hover:bg-accent-hover active:bg-accent-hover';
  const variants = {
    primary,
    // 'ai' kept for existing callers; the accent is the one signal
    ai: primary,
    secondary: 'bg-paper-3 text-ink hover:bg-rule',
    outline: 'border border-rule-strong bg-surface text-ink hover:bg-paper-2',
    ghost: 'text-ink-2 hover:bg-paper-3 hover:text-ink',
    danger: 'border border-rule-strong bg-surface text-expense hover:bg-expense-soft',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-10 px-5 text-md',
    icon: 'h-10 w-10',
  };

  return (
    <button
      type={type}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full motion-safe:animate-spin"
        />
      ) : null}
      {children}
    </button>
  );
};
