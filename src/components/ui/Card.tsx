import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Kept for existing callers; every card is now the same solid surface */
  glass?: boolean;
  as?: 'div' | 'section' | 'article';
  /** Decorative illustration resting in the bottom-right corner, behind the content */
  art?: string;
  artClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glass: _glass,
  as: Tag = 'section',
  art,
  artClassName,
  ...props
}) => {
  return (
    <Tag
      className={cn(
        'relative overflow-hidden rounded-card border border-rule bg-surface p-4 sm:p-5 shadow-[var(--shadow-card)]',
        className
      )}
      {...props}
    >
      {art && (
        <img
          src={art}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className={cn('card-art -bottom-6 -right-6 w-40 sm:w-48 opacity-20 dark:opacity-15', artClassName)}
        />
      )}
      {art ? <div className="relative z-[1] flex flex-1 flex-col">{children}</div> : children}
    </Tag>
  );
};

/** Title row shared by every card: optional illustration, heading, one-line description, action */
export const CardHeader: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
  art?: string;
}> = ({ title, description, action, id, art }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-4">
    <div className="flex min-w-0 items-center gap-3">
      {art && (
        <img
          src={art}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_6px_10px_var(--color-glow-1)]"
        />
      )}
      <div className="min-w-0">
        <h2 id={id} className="text-lg text-ink">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
