import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    X,
    Lock,
    Mail,
    User as UserIcon,
    AlertCircle,
    Loader2,
    Eye,
    EyeOff,
    Terminal,
    Sparkles,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
    const {
        isAuthModalOpen,
        authModalMode,
        closeAuthModal,
        openAuthModal,
        login,
        register,
        error,
        clearError,
    } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clientValidationError, setClientValidationError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthModalOpen) {
            clearError();
            setClientValidationError(null);
        }
    }, [isAuthModalOpen, authModalMode, clearError]);

    if (!isAuthModalOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setClientValidationError(null);
        clearError();

        // Basic client validation
        if (authModalMode === 'register' && (!name.trim() || name.trim().length < 2)) {
            setClientValidationError('Please enter a full name (minimum 2 characters).');
            return;
        }

        if (!email.trim() || !email.includes('@')) {
            setClientValidationError('Please provide a valid email address.');
            return;
        }

        if (!password || password.length < 8) {
            setClientValidationError('Password must be at least 8 characters long.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (authModalMode === 'login') {
                await login(email.trim(), password);
            } else {
                await register(name.trim(), email.trim(), password);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDemoFill = () => {
        setEmail('sofia.chen@devflow.ai');
        setPassword('SofiaDevFlow2026!');
        if (authModalMode === 'register') {
            setName('Sofia Chen');
        }
        setClientValidationError(null);
        clearError();
    };

    const activeError = clientValidationError || error;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
            {/* Modal Card */}
            <div
                className="w-full max-w-md bg-dev-surface border border-dev-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
            >
                {/* Header */}
                <div className="p-5 border-b border-dev-border flex items-center justify-between bg-dev-subtle/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-dev-subtle border border-dev-border flex items-center justify-center text-dev-accent">
                            <Terminal className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 id="auth-modal-title" className="text-sm font-semibold text-dev-heading">
                                {authModalMode === 'login' ? 'Sign in to DevFlow AI' : 'Create DevFlow Account'}
                            </h2>
                            <p className="text-[11px] text-dev-textSubtle">
                                {authModalMode === 'login'
                                    ? 'Access your developer workspace & tasks'
                                    : 'Start organizing projects with secure user ownership'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={closeAuthModal}
                        className="text-dev-textMuted hover:text-dev-heading transition-colors p-1"
                        aria-label="Close authentication modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs: Sign In / Create Account */}
                <div className="flex border-b border-dev-border bg-dev-subtle/10 text-xs">
                    <button
                        type="button"
                        onClick={() => openAuthModal('login')}
                        className={`flex-1 py-2.5 font-medium transition-colors border-b-2 ${authModalMode === 'login'
                            ? 'border-dev-accent text-dev-heading font-semibold bg-dev-surface'
                            : 'border-transparent text-dev-textMuted hover:text-dev-heading'
                            }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => openAuthModal('register')}
                        className={`flex-1 py-2.5 font-medium transition-colors border-b-2 ${authModalMode === 'register'
                            ? 'border-dev-accent text-dev-heading font-semibold bg-dev-surface'
                            : 'border-transparent text-dev-textMuted hover:text-dev-heading'
                            }`}
                    >
                        Create Account
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Error Alert Box */}
                    {activeError && (
                        <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <span className="font-semibold block">Authentication Error</span>
                                <span className="text-[11px] text-red-200/90">{activeError}</span>
                            </div>
                        </div>
                    )}

                    {/* Name Field (Only on Register) */}
                    {authModalMode === 'register' && (
                        <div>
                            <label className="block text-xs font-medium text-dev-text mb-1.5">
                                Full Name
                            </label>
                            <div className="relative">
                                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dev-textSubtle" />
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Alex Rivera"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-xs bg-dev-bg border border-dev-border rounded-md text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-borderHighlight focus:ring-1 focus:ring-dev-accent"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    )}

                    {/* Email Field */}
                    <div>
                        <label className="block text-xs font-medium text-dev-text mb-1.5">
                            Work Email
                        </label>
                        <div className="relative">
                            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dev-textSubtle" />
                            <input
                                type="email"
                                required
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 text-xs bg-dev-bg border border-dev-border rounded-md text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-borderHighlight focus:ring-1 focus:ring-dev-accent"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-dev-text">
                                Password
                            </label>
                            {authModalMode === 'register' && (
                                <span className="text-[10px] text-dev-textSubtle">Min. 8 characters</span>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dev-textSubtle" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="••••••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-9 pl-9 pr-9 text-xs bg-dev-bg border border-dev-border rounded-md text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-borderHighlight focus:ring-1 focus:ring-dev-accent"
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-dev-textSubtle hover:text-dev-heading"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-9 mt-2 rounded-md bg-dev-accent hover:bg-dev-accentHover text-dev-bg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{authModalMode === 'login' ? 'Authenticating...' : 'Creating Account...'}</span>
                            </>
                        ) : (
                            <span>{authModalMode === 'login' ? 'Sign In to Workspace' : 'Create Developer Account'}</span>
                        )}
                    </button>

                    {/* Quick Demo Credentials Fill Shortcut */}
                    <div className="pt-2 border-t border-dev-border/60">
                        <button
                            type="button"
                            onClick={handleDemoFill}
                            className="w-full py-1.5 px-3 rounded text-[11px] bg-dev-subtle hover:bg-dev-surfaceHover border border-dev-border text-dev-textMuted hover:text-dev-heading flex items-center justify-center gap-1.5 transition-colors font-mono"
                        >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Fill Seed Workspace Account (Sofia Chen)
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
