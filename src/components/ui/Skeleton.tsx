import React from 'react';
import { cn } from '../../utils/cn';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-control bg-paper-3 motion-safe:animate-pulse', className)}
      {...props}
    />
  );
};

export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="space-y-4" role="status" aria-label="Đang tải">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      <div className="rounded-card border border-rule bg-surface p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={`h-${i}`} className="h-4 rounded-chip" />
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="min-h-[64px] sm:min-h-[92px] rounded-control" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const AnalyticsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải">
      <Skeleton className="h-11 w-full" />

      <div className="rounded-card border border-rule bg-surface p-5 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-32 max-w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-rule bg-surface p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12" />
          <Skeleton className="h-5 w-40" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-7" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-chip" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6" role="status" aria-label="Đang tải">
      {[3, 2, 3].map((fields, i) => (
        <div key={i} className="rounded-card border border-rule bg-surface p-5 sm:p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: fields }, (_, j) => (
            <Skeleton key={j} className="h-10 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải">
      {/* Balance ledger */}
      <div className="rounded-card border border-rule bg-surface p-5 sm:p-6 space-y-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-12 w-72 max-w-full" />
        <div className="grid grid-cols-3 gap-4 pt-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Skeleton className="h-72 rounded-card lg:col-span-5" />
        <Skeleton className="h-72 rounded-card lg:col-span-7" />
      </div>
    </div>
  );
};
