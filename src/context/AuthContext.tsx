import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiClient, ApiError } from '../services/apiClient';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    clearError: () => void;
    isAuthModalOpen: boolean;
    authModalMode: 'login' | 'register';
    openAuthModal: (mode?: 'login' | 'register') => void;
    closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setTokenState] = useState<string | null>(apiClient.getToken());
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

    const clearError = useCallback(() => setError(null), []);

    const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
        setAuthModalMode(mode);
        setError(null);
        setIsAuthModalOpen(true);
    }, []);

    const closeAuthModal = useCallback(() => {
        setIsAuthModalOpen(false);
        setError(null);
    }, []);

    // Session initialization on app mount
    useEffect(() => {
        let isMounted = true;

        const initializeSession = async () => {
            const existingToken = apiClient.getToken();
            if (!existingToken) {
                if (isMounted) {
                    setIsLoading(false);
                }
                return;
            }

            try {
                const res = await apiClient.getMe();
                if (isMounted) {
                    setUser(res.user);
                    setTokenState(existingToken);
                }
            } catch (err) {
                if (isMounted) {
                    // Token expired or invalid
                    apiClient.setToken(null);
                    setUser(null);
                    setTokenState(null);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        initializeSession();

        // Listen for session expiry from API calls
        const unsubscribe = apiClient.onAuthError(() => {
            if (isMounted) {
                setUser(null);
                setTokenState(null);
                setError('Your session has expired. Please sign in again.');
                setIsAuthModalOpen(true);
                setAuthModalMode('login');
            }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        setError(null);
        try {
            const res = await apiClient.login({ email, password });
            setUser(res.user);
            setTokenState(res.token);
            setIsAuthModalOpen(false);
            return true;
        } catch (err: any) {
            const msg = err instanceof ApiError ? err.message : err.message || 'Login failed. Please check your credentials.';
            setError(msg);
            return false;
        }
    };

    const register = async (name: string, email: string, password: string): Promise<boolean> => {
        setError(null);
        try {
            const res = await apiClient.register({ name, email, password });
            setUser(res.user);
            setTokenState(res.token);
            setIsAuthModalOpen(false);
            return true;
        } catch (err: any) {
            const msg = err instanceof ApiError ? err.message : err.message || 'Registration failed. Please check your input.';
            setError(msg);
            return false;
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await apiClient.logout();
        } finally {
            setUser(null);
            setTokenState(null);
            setError(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user && !!token,
                isLoading,
                error,
                login,
                register,
                logout,
                clearError,
                isAuthModalOpen,
                authModalMode,
                openAuthModal,
                closeAuthModal,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
