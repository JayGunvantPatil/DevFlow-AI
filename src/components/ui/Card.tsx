import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
    className,
    hover = false,
    children,
    ...props
}) => {
    return (
        <div
            className={cn(
                'bg-dev-surface border border-dev-border rounded-lg shadow-dev-card transition-all',
                hover && 'hover:border-dev-borderHighlight hover:bg-dev-surfaceHover',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <div
            className={cn('p-5 border-b border-dev-border flex items-center justify-between gap-4', className)}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <h3 className={cn('text-base font-semibold text-dev-heading', className)} {...props}>
            {children}
        </h3>
    );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <p className={cn('text-xs text-dev-textMuted mt-0.5', className)} {...props}>
            {children}
        </p>
    );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <div className={cn('p-5', className)} {...props}>
            {children}
        </div>
    );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <div
            className={cn('p-4 px-5 bg-dev-subtle/40 border-t border-dev-border rounded-b-lg flex items-center justify-between', className)}
            {...props}
        >
            {children}
        </div>
    );
};
