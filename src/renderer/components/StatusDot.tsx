import { Circle } from '@phosphor-icons/react';
import type { SyncStatus } from '@core/types';
import { cn } from '@/lib/utils';

interface StatusDotProps {
  status: SyncStatus;
  size?: number;
  className?: string;
}

const statusColors: Record<SyncStatus, string> = {
  green: 'text-status-green',
  yellow: 'text-status-yellow',
  red: 'text-status-red',
};

export function StatusDot({ status, size = 12, className }: StatusDotProps) {
  return (
    <Circle
      weight="fill"
      size={size}
      className={cn(statusColors[status], className)}
    />
  );
}
