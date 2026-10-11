import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
        variant?: ButtonProps['variant'];
        icon?: LucideIcon;
        disabled?: boolean;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
    badge?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    className,
    badge,
}) => {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-dev-border bg-dev-surface/40',
                className
            )}
        >
            <div className="w-12 h-12 rounded-xl bg-dev-subtle flex items-center justify-center text-dev-textMuted border border-dev-border mb-4">
                <Icon className="w-6 h-6 text-dev-textMuted" />
            </div>

            {badge && (
                <span className="text-[11px] font-mono uppercase tracking-wider text-dev-accent bg-dev-accentSubtle border border-dev-accent/30 px-2 py-0.5 rounded mb-2">
                    {badge}
                </span>
            )}

            <h3 className="text-base font-semibold text-dev-heading mb-1">{title}</h3>
            <p className="text-xs text-dev-textMuted max-w-sm leading-relaxed mb-6">
                {description}
            </p>

            {(action || secondaryAction) && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {action && (
                        <Button
                            variant={action.variant || 'primary'}
                            size="sm"
                            icon={action.icon}
                            disabled={action.disabled}
                            onClick={action.onClick}
                        >
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={secondaryAction.onClick}
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};
