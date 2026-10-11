import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'secondary',
            size = 'md',
            icon: Icon,
            iconPosition = 'left',
            loading = false,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const baseStyles =
            'inline-flex items-center justify-center font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dev-accent focus-visible:ring-offset-2 focus-visible:ring-offset-dev-bg disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

        const variants = {
            // GitHub-style emerald action button
            primary:
                'bg-dev-accent hover:bg-dev-accentHover text-white border border-dev-accentBorder shadow-sm font-semibold',
            // Standard dark panel button
            secondary:
                'bg-dev-subtle hover:bg-dev-surfaceHover text-dev-text border border-dev-border hover:border-dev-borderHighlight shadow-sm',
            // Transparent outline button
            outline:
                'bg-transparent hover:bg-dev-subtle text-dev-text border border-dev-border hover:border-dev-borderHighlight',
            // Ghost button for clean toolbars
            ghost:
                'bg-transparent hover:bg-dev-subtle text-dev-textMuted hover:text-dev-heading',
            // Danger button for deletes/critical operations
            danger:
                'bg-dev-redSubtle hover:bg-red-950/50 text-dev-red border border-dev-red/30 hover:border-dev-red/60',
        };

        const sizes = {
            sm: 'text-xs px-2.5 py-1.5 gap-1.5 h-8',
            md: 'text-sm px-3.5 py-2 gap-2 h-9',
            lg: 'text-base px-5 py-2.5 gap-2.5 h-11',
        };

        const isDisabled = disabled || loading;

        return (
            <button
                ref={ref}
                disabled={isDisabled}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                {...props}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-current" />
                ) : (
                    Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />
                )}
                {children}
                {!loading && Icon && iconPosition === 'right' && (
                    <Icon className="w-4 h-4 shrink-0" />
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';
