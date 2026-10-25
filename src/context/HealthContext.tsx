import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HealthCheckResult } from '../types';
import { apiClient } from '../services/apiClient';

interface HealthContextType {
    health: HealthCheckResult;
    refreshHealth: () => Promise<void>;
}

export const defaultHealthState: HealthCheckResult = {
    data: null,
    latencyMs: null,
    error: null,
    loading: true,
    lastChecked: null,
};

const HealthContext = createContext<HealthContextType>({
    health: defaultHealthState,
    refreshHealth: async () => {},
});

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [health, setHealth] = useState<HealthCheckResult>(defaultHealthState);

    const refreshHealth = useCallback(async () => {
        setHealth((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const res = await apiClient.checkHealth();
            setHealth({
                data: res.data,
                latencyMs: res.latencyMs,
                error: null,
                loading: false,
                lastChecked: new Date(),
            });
        } catch (err: unknown) {
            const msg =
                typeof err === 'object' && err !== null && 'message' in err
                    ? (err as { message: string }).message
                    : 'Failed to connect to /api/health';
            const latency =
                typeof err === 'object' && err !== null && 'latencyMs' in err
                    ? (err as { latencyMs: number }).latencyMs
                    : null;
            setHealth({
                data: null,
                latencyMs: latency,
                error: msg,
                loading: false,
                lastChecked: new Date(),
            });
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        // Perform initial health check
        refreshHealth();

        // Heartbeat poll every 45 seconds to keep telemetry live
        const interval = setInterval(() => {
            if (isMounted) {
                refreshHealth();
            }
        }, 45000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [refreshHealth]);

    return (
        <HealthContext.Provider value={{ health, refreshHealth }}>
            {children}
        </HealthContext.Provider>
    );
};

export const useHealth = (): HealthContextType => {
    const context = useContext(HealthContext);
    if (!context) {
        return {
            health: defaultHealthState,
            refreshHealth: async () => {},
        };
    }
    return context;
};
