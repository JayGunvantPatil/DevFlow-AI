import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingIndicatorProps {
    label?: string;
    text?: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
    label,
    text,
    size = 'md',
    className,
}) => {
    const displayLabel = label ?? text ?? 'Loading...';
    const sizes = {
        sm: 'w-4 h-4 text-xs',
        md: 'w-6 h-6 text-sm',
        lg: 'w-8 h-8 text-base',
    };

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center p-8 gap-3 text-dev-textMuted',
                className
            )}
        >
            <Loader2 className={cn('animate-spin text-dev-accent', sizes[size].split(' ')[0], sizes[size].split(' ')[1])} />
            {displayLabel && <span className={sizes[size].split(' ')[2]}>{displayLabel}</span>}
        </div>
    );
};

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
}) => {
    return (
        <div
            className={cn(
                'animate-pulse rounded bg-dev-subtle border border-dev-border/50',
                className
            )}
            {...props}
        />
    );
};
