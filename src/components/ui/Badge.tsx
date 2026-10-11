import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
    dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
    className,
    variant = 'neutral',
    dot = false,
    children,
    ...props
}) => {
    const variants = {
        success: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
        warning: 'bg-amber-950/50 text-amber-300 border-amber-800/40',
        danger: 'bg-red-950/60 text-red-400 border-red-800/40',
        info: 'bg-blue-950/60 text-blue-300 border-blue-800/40',
        purple: 'bg-purple-950/60 text-purple-300 border-purple-800/40',
        neutral: 'bg-dev-subtle text-dev-textMuted border-dev-border',
    };

    const dotColors = {
        success: 'bg-emerald-400',
        warning: 'bg-amber-400',
        danger: 'bg-red-400',
        info: 'bg-blue-400',
        purple: 'bg-purple-400',
        neutral: 'bg-gray-400',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors',
                variants[variant],
                className
            )}
            {...props}
        >
            {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
            {children}
        </span>
    );
};
