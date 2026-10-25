import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glass = true,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl p-5 transition-all duration-300',
        glass
          ? 'bg-white/80 dark:bg-[#121623]/80 backdrop-blur-xl border border-neutral-200/80 dark:border-white/[0.08] shadow-sm shadow-black/5'
          : 'bg-white dark:bg-[#121623] border border-neutral-200 dark:border-neutral-800',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
