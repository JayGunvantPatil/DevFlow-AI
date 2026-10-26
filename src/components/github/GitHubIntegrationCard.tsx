import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Github,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    ExternalLink,
    Unlink,
    Shield,
    Lock,
    Key,
    UserCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { apiClient } from '../../services/apiClient';
import { GitHubIntegration } from '../../types';

interface GitHubIntegrationCardProps {
    returnTo?: string;
    onStatusChange?: (connected: boolean) => void;
}

export const GitHubIntegrationCard: React.FC<GitHubIntegrationCardProps> = ({
    returnTo = '/settings',
    onStatusChange,
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [integration, setIntegration] = useState<GitHubIntegration | null>(null);
    const [configured, setConfigured] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);
    const [connecting, setConnecting] = useState<boolean>(false);
    const [disconnecting, setDisconnecting] = useState<boolean>(false);
    const [showDisconnectModal, setShowDisconnectModal] = useState<boolean>(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    // Fetch active GitHub integration status
    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.getGitHubStatus();
            setConfigured(res.configured);
            setIntegration(res.integration);
            if (onStatusChange) {
                onStatusChange(res.connected);
            }
        } catch (err: any) {
            setNotification({
                type: 'error',
                message: err.message || 'Failed to load GitHub integration status.',
            });
        } finally {
            setLoading(false);
        }
    }, [onStatusChange]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Handle return parameters from GitHub callback (?github=connected or ?github=error)
    useEffect(() => {
        const ghStatus = searchParams.get('github');
        const messageParam = searchParams.get('message');
        const usernameParam = searchParams.get('username');

        if (ghStatus === 'connected') {
            setNotification({
                type: 'success',
                message: usernameParam
                    ? `Successfully connected GitHub account (@${usernameParam})!`
                    : 'GitHub account connected successfully!',
            });
            fetchStatus();
            // Clean up URL parameters
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('github');
            nextParams.delete('username');
            setSearchParams(nextParams, { replace: true });
        } else if (ghStatus === 'error') {
            setNotification({
                type: 'error',
                message: messageParam || 'GitHub authorization was declined or encountered an error.',
            });
            fetchStatus();
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('github');
            nextParams.delete('message');
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, setSearchParams, fetchStatus]);

    // Connect to GitHub
    const handleConnect = async () => {
        setConnecting(true);
        setNotification(null);
        try {
            const res = await apiClient.getGitHubConnectUrl(returnTo);
            if (res.url) {
                window.location.href = res.url;
            } else {
                throw new Error('No authorization URL returned from server');
            }
        } catch (err: any) {
            setConnecting(false);
            setNotification({
                type: 'error',
                message:
                    err.message ||
                    'Unable to initiate GitHub authorization. Ensure server environment variables are configured.',
            });
        }
    };

    // Disconnect GitHub
    const handleDisconnect = async () => {
        setDisconnecting(true);
        setNotification(null);
        try {
            await apiClient.disconnectGitHub();
            setIntegration(null);
            setShowDisconnectModal(false);
            setNotification({
                type: 'info',
                message: 'GitHub connection disconnected successfully.',
            });
            if (onStatusChange) {
                onStatusChange(false);
            }
        } catch (err: any) {
            setNotification({
                type: 'error',
                message: err.message || 'Failed to disconnect GitHub account.',
            });
        } finally {
            setDisconnecting(false);
        }
    };

    return (
        <Card className="border-dev-borderHighlight/40">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Github className="w-5 h-5 text-dev-heading" />
                        <CardTitle className="text-sm">GitHub Integration</CardTitle>
                    </div>
                    {loading ? (
                        <RefreshCw className="w-4 h-4 text-dev-textMuted animate-spin" />
                    ) : integration ? (
                        <Badge variant="success" className="gap-1.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                        </Badge>
                    ) : configured ? (
                        <Badge variant="neutral">Not Connected</Badge>
                    ) : (
                        <Badge variant="warning">Awaiting Server Config</Badge>
                    )}
                </div>
                <CardDescription>
                    Secure GitHub App authorization for repository synchronization, PR reviews, and code intelligence.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4 text-xs">
                {/* Status Banners */}
                {notification && (
                    <div
                        className={`p-3 px-4 rounded-lg flex items-center justify-between gap-3 text-xs ${
                            notification.type === 'success'
                                ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-300'
                                : notification.type === 'error'
                                ? 'bg-dev-redSubtle border border-dev-red/30 text-dev-red'
                                : 'bg-dev-blueSubtle border border-dev-blue/30 text-dev-blue'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
                            {notification.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-dev-red" />}
                            {notification.type === 'info' && <AlertCircle className="w-4 h-4 shrink-0 text-dev-blue" />}
                            <span>{notification.message}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setNotification(null)}
                            className="text-dev-textMuted hover:text-dev-text transition-colors text-base leading-none"
                            aria-label="Dismiss alert"
                        >
                            &times;
                        </button>
                    </div>
                )}

                {/* Unconfigured Warning Note */}
                {!loading && !configured && (
                    <div className="p-3.5 rounded-lg bg-dev-subtle/70 border border-dev-amber/30 text-dev-text space-y-2">
                        <div className="flex items-center gap-2 text-dev-amber font-semibold text-xs">
                            <Shield className="w-4 h-4 text-dev-amber shrink-0" />
                            Server Configuration Required
                        </div>
                        <p className="text-[11px] text-dev-textMuted leading-relaxed">
                            To enable live GitHub authorization, define <code className="text-dev-text font-mono">GITHUB_CLIENT_ID</code> and <code className="text-dev-text font-mono">GITHUB_CLIENT_SECRET</code> (or <code className="text-dev-text font-mono">GITHUB_APP_SLUG</code>) in your Vercel project environment variables or local <code className="text-dev-text font-mono">.env.local</code> file.
                        </p>
                    </div>
                )}

                {/* State: Connected Account */}
                {integration ? (
                    <div className="p-4 rounded-lg bg-dev-bg border border-dev-border space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {integration.avatarUrl ? (
                                    <img
                                        src={integration.avatarUrl}
                                        alt={integration.username || 'GitHub User'}
                                        className="w-11 h-11 rounded-full border border-dev-border object-cover"
                                    />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-dev-subtle flex items-center justify-center border border-dev-border">
                                        <Github className="w-6 h-6 text-dev-text" />
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-dev-heading">
                                            {integration.username ? `@${integration.username}` : 'GitHub User'}
                                        </span>
                                        <Badge variant="info" className="text-[10px] py-0 px-1.5">
                                            {integration.accountType}
                                        </Badge>
                                    </div>
                                    <span className="text-[11px] text-dev-textSubtle block mt-0.5">
                                        Authorized on {new Date(integration.connectedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {integration.username && (
                                    <a
                                        href={`https://github.com/${integration.username}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-dev-textMuted hover:text-dev-text px-2.5 py-1.5 rounded-md hover:bg-dev-subtle transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        View Profile
                                    </a>
                                )}
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setShowDisconnectModal(true)}
                                    className="gap-1.5"
                                >
                                    <Unlink className="w-3.5 h-3.5" />
                                    Disconnect
                                </Button>
                            </div>
                        </div>

                        {/* Integration Security & Permission Badges */}
                        <div className="pt-3 border-t border-dev-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div className="p-2 rounded bg-dev-subtle/50 flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-dev-accent shrink-0" />
                                <span className="text-dev-textMuted">Scope:</span>
                                <span className="font-mono text-dev-heading">{integration.scope || 'read:user'}</span>
                            </div>
                            <div className="p-2 rounded bg-dev-subtle/50 flex items-center gap-2">
                                <UserCheck className="w-3.5 h-3.5 text-dev-blue shrink-0" />
                                <span className="text-dev-textMuted">Status:</span>
                                <span className="text-emerald-400 font-medium capitalize">{integration.status}</span>
                            </div>
                            <div className="p-2 rounded bg-dev-subtle/50 flex items-center gap-2">
                                <Key className="w-3.5 h-3.5 text-dev-purple shrink-0" />
                                <span className="text-dev-textMuted">Install ID:</span>
                                <span className="font-mono text-dev-heading truncate">
                                    {integration.installationId || 'OAuth User Token'}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* State: Not Connected */
                    <div className="p-4 rounded-lg bg-dev-bg border border-dev-border space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <span className="font-semibold text-dev-heading text-xs block">
                                    Connect GitHub Account or Organization
                                </span>
                                <p className="text-[11px] text-dev-textMuted leading-relaxed max-w-xl">
                                    Authorizes DevFlow AI to read repository metadata, check pull requests, and synchronize workspaces. Read-only permissions with no write or administrative access.
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleConnect}
                                disabled={connecting}
                                className="gap-2 shrink-0 self-start sm:self-center"
                            >
                                {connecting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Redirecting to GitHub...
                                    </>
                                ) : (
                                    <>
                                        <Github className="w-4 h-4" />
                                        Connect GitHub
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Security Guarantees */}
                        <div className="pt-3 border-t border-dev-border/60 flex flex-wrap items-center gap-4 text-[11px] text-dev-textSubtle">
                            <span className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-dev-accent" />
                                Minimal repository read scope
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-dev-blue" />
                                Cryptographic CSRF state validation
                            </span>
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-dev-purple" />
                                Isolated per-user ownership
                            </span>
                        </div>
                    </div>
                )}
            </CardContent>

            {/* Disconnect Confirmation Modal */}
            <Modal
                isOpen={showDisconnectModal}
                onClose={() => setShowDisconnectModal(false)}
                title="Disconnect GitHub Account"
                description="Confirm revocation of GitHub authorization"
                footer={
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowDisconnectModal(false)}
                            disabled={disconnecting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={handleDisconnect}
                            disabled={disconnecting}
                            className="gap-1.5"
                        >
                            {disconnecting ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    Disconnecting...
                                </>
                            ) : (
                                <>
                                    <Unlink className="w-3.5 h-3.5" />
                                    Confirm Disconnect
                                </>
                            )}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-3 text-xs text-dev-text leading-relaxed">
                    <p>
                        Are you sure you want to disconnect{' '}
                        <strong className="text-dev-heading">
                            {integration?.username ? `@${integration.username}` : 'your GitHub account'}
                        </strong>{' '}
                        from DevFlow AI?
                    </p>
                    <div className="p-3 rounded bg-dev-subtle border border-dev-border text-[11px] text-dev-textMuted space-y-1">
                        <p>&bull; DevFlow AI will immediately remove active access tokens and installation references.</p>
                        <p>&bull; Repository synchronization and automated PR review checks will pause until reconnected.</p>
                        <p>&bull; You can reconnect your account at any time.</p>
                    </div>
                </div>
            </Modal>
        </Card>
    );
};
