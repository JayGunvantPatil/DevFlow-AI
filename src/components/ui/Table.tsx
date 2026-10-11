import React from 'react';
import { cn } from '../../lib/utils';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <div className="w-full overflow-x-auto rounded-lg border border-dev-border">
            <table className={cn('w-full text-left border-collapse text-xs', className)} {...props}>
                {children}
            </table>
        </div>
    );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <thead
            className={cn('bg-dev-subtle/80 text-dev-textMuted uppercase tracking-wider text-[11px] border-b border-dev-border font-medium', className)}
            {...props}
        >
            {children}
        </thead>
    );
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <tbody className={cn('divide-y divide-dev-border bg-dev-surface', className)} {...props}>
            {children}
        </tbody>
    );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <tr
            className={cn('hover:bg-dev-surfaceHover transition-colors', className)}
            {...props}
        >
            {children}
        </tr>
    );
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <th className={cn('px-4 py-3 font-semibold text-dev-text', className)} {...props}>
            {children}
        </th>
    );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
    className,
    children,
    ...props
}) => {
    return (
        <td className={cn('px-4 py-3 text-dev-text align-middle', className)} {...props}>
            {children}
        </td>
    );
};
