import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, LogIn, Sparkles } from 'lucide-react';

interface ProtectedRouteProps {
    children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isAuthenticated, isLoading, openAuthModal } = useAuth();
    const outletContext = useOutletContext();

    if (isLoading) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-dev-accent border-t-transparent animate-spin" />
                <span className="text-xs text-dev-textMuted font-mono">Verifying DevFlow session...</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-xl bg-dev-subtle border border-dev-border flex items-center justify-center text-dev-accent mb-4 shadow-sm">
                    <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-base font-semibold text-dev-heading mb-1.5">
                    Authentication Required
                </h2>
                <p className="text-xs text-dev-textMuted leading-relaxed mb-6">
                    This section belongs to an authorized developer workspace. Please sign in or create an account to view and manage your projects and sprint tasks.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                    <button
                        onClick={() => openAuthModal('login')}
                        className="w-full sm:w-auto px-4 py-2 rounded-md bg-dev-accent hover:bg-dev-accentHover text-dev-bg font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                    </button>
                    <button
                        onClick={() => openAuthModal('register')}
                        className="w-full sm:w-auto px-4 py-2 rounded-md bg-dev-surface hover:bg-dev-surfaceHover border border-dev-border text-dev-text hover:text-dev-heading font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-dev-accent" />
                        <span>Create Account</span>
                    </button>
                </div>
            </div>
        );
    }

    return children ? <>{children}</> : <Outlet context={outletContext} />;
};
