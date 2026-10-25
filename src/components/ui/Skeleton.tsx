import React from 'react';
import { cn } from '../../utils/cn';

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-neutral-200/70 dark:bg-neutral-800/70 animate-pulse',
        className
      )}
      {...props}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Banner Skeleton */}
      <Skeleton className="h-44 w-full rounded-3xl" />

      {/* Bento Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl md:col-span-2 lg:col-span-1" />
      </div>

      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
};
