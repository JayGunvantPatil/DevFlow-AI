import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

export interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('DevFlow UI Uncaught Render Error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = (): void => {
        window.location.reload();
    };

    handleReset = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-dev-bg text-dev-text flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-dev-surface border border-dev-border rounded-xl p-6 shadow-2xl">
                        <div className="w-12 h-12 rounded-xl bg-dev-redSubtle border border-dev-red/30 flex items-center justify-center text-dev-red mb-4">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-bold text-dev-heading tracking-tight mb-2">
                            Workspace Render Issue
                        </h2>
                        <p className="text-xs text-dev-textMuted leading-relaxed mb-4">
                            DevFlow encountered an unexpected error while rendering this view. Your session and workspace data remain safe.
                        </p>

                        {this.state.error && (
                            <div className="mb-5 p-3 rounded-md bg-dev-subtle border border-dev-border font-mono text-[11px] text-red-300 break-words max-h-32 overflow-y-auto">
                                <span className="font-semibold block text-red-400">Error:</span>
                                {this.state.error.message || 'Unknown runtime error'}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2 border-t border-dev-border/60">
                            <Button
                                variant="primary"
                                size="sm"
                                icon={RefreshCw}
                                onClick={this.handleReload}
                                className="w-full sm:w-auto"
                            >
                                Refresh Workspace
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={Home}
                                onClick={this.handleReset}
                                className="w-full sm:w-auto"
                            >
                                Return to Dashboard
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
