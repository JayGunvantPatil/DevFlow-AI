import React from 'react';
import { cn } from '../../lib/utils';
import { FileCode, Plus, Minus } from 'lucide-react';

export interface DiffViewerProps {
    diff: string;
    filename?: string;
    className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
    diff,
    filename,
    className,
}) => {
    const lines = diff.split('\n');

    return (
        <div
            className={cn(
                'rounded-lg border border-dev-border bg-dev-bg font-mono-code text-xs overflow-hidden shadow-sm',
                className
            )}
        >
            {filename && (
                <div className="bg-dev-subtle px-4 py-2 border-b border-dev-border flex items-center justify-between text-dev-textMuted">
                    <div className="flex items-center gap-2 font-sans font-medium text-dev-heading">
                        <FileCode className="w-4 h-4 text-dev-accent" />
                        <span>{filename}</span>
                    </div>
                    <span className="text-[11px] text-dev-textSubtle font-sans">unified diff</span>
                </div>
            )}

            <div className="overflow-x-auto divide-y divide-dev-border/20">
                {lines.map((line, idx) => {
                    const isAdd = line.startsWith('+');
                    const isRemove = line.startsWith('-');
                    const isHunk = line.startsWith('@@');

                    let lineBg = 'bg-transparent text-dev-text';
                    let lineSign = ' ';
                    let iconColor = 'text-dev-textSubtle';

                    if (isAdd) {
                        lineBg = 'bg-emerald-950/30 text-emerald-300';
                        lineSign = '+';
                        iconColor = 'text-emerald-400';
                    } else if (isRemove) {
                        lineBg = 'bg-red-950/30 text-red-300';
                        lineSign = '-';
                        iconColor = 'text-red-400';
                    } else if (isHunk) {
                        lineBg = 'bg-dev-subtle/60 text-dev-blue font-semibold';
                    }

                    return (
                        <div
                            key={idx}
                            className={cn(
                                'flex items-center leading-6 hover:brightness-110 transition-colors select-text',
                                lineBg
                            )}
                        >
                            {/* Line number gutter */}
                            <div className="w-10 shrink-0 text-right pr-2 text-dev-textSubtle select-none text-[11px] opacity-60">
                                {idx + 1}
                            </div>

                            {/* Symbol indicator */}
                            <div className={cn('w-5 shrink-0 flex items-center justify-center select-none text-xs font-bold', iconColor)}>
                                {isAdd ? <Plus className="w-3 h-3" /> : isRemove ? <Minus className="w-3 h-3" /> : lineSign}
                            </div>

                            {/* Code content */}
                            <pre className="px-2 py-0.5 whitespace-pre overflow-x-auto flex-1 font-mono-code text-[12px]">
                                {line.startsWith('+') || line.startsWith('-') ? line.slice(1) : line}
                            </pre>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
