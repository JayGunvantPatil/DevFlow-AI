import React, { useState, useEffect } from 'react';
import { Info, Lock, CheckCircle2, RefreshCw, FolderGit2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { GitHubIntegrationCard } from '../components/github/GitHubIntegrationCard';
import { apiClient } from '../services/apiClient';
import { GitHubIntegration } from '../types';

export const Repositories: React.FC = () => {
    const [connected, setConnected] = useState<boolean>(false);
    const [integration, setIntegration] = useState<GitHubIntegration | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const checkStatus = async () => {
        try {
            const res = await apiClient.getGitHubStatus();
            setConnected(res.connected);
            setIntegration(res.integration);
        } catch {
            // Keep disconnected state on error
            setConnected(false);
            setIntegration(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Primary GitHub Integration Card */}
            <GitHubIntegrationCard
                returnTo="/repositories"
                onStatusChange={(isConnected) => {
                    setConnected(isConnected);
                    checkStatus();
                }}
            />

            {/* Repositories Synchronization Panel */}
            <Card className="border-dev-borderHighlight/40">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4 text-dev-blue" />
                            <CardTitle className="text-sm">Source Repositories</CardTitle>
                        </div>
                        {loading ? (
                            <Badge variant="neutral">Checking...</Badge>
                        ) : connected ? (
                            <Badge variant="success" className="gap-1 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Synchronized
                            </Badge>
                        ) : (
                            <Badge variant="neutral">Awaiting Connection</Badge>
                        )}
                    </div>
                    <CardDescription>
                        {connected
                            ? `Active connection with @${integration?.username || 'GitHub'}. Repository synchronization is authorized.`
                            : 'Connect your GitHub profile above to enable repository indexing, branch analysis, and pull request reviews.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                    {connected ? (
                        <div className="p-4 rounded-lg bg-dev-bg border border-dev-border space-y-3">
                            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                                <CheckCircle2 className="w-4 h-4" />
                                GitHub Authorization Established
                            </div>
                            <p className="text-[11px] text-dev-textMuted leading-relaxed">
                                DevFlow AI is authorized with minimal read-only permissions for account{' '}
                                <strong className="text-dev-heading">
                                    {integration?.username ? `@${integration.username}` : 'GitHub'}
                                </strong>
                                . Repository lists, branch protection rules, and commit history are protected under user-scoped database isolation.
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 rounded-lg bg-dev-bg border border-dev-border space-y-3 text-dev-textMuted text-[11px] leading-relaxed">
                            <p>
                                When your GitHub account is connected using the button above:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-dev-text">
                                <li>Minimal read-only access is granted via GitHub App / OAuth.</li>
                                <li>Session state is verified with HMAC-SHA256 signatures to protect against CSRF attacks.</li>
                                <li>Connection ownership is isolated to your private DevFlow AI profile in Neon PostgreSQL.</li>
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Architecture & Security Overview Panel */}
            <Card className="border-dev-borderHighlight/30">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-dev-purple" />
                        <CardTitle className="text-sm">Phase 4A Security Architecture</CardTitle>
                    </div>
                    <CardDescription>
                        Zero-trust credential boundaries and server-side authorization enforcement
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-dev-text leading-relaxed">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                            <span className="font-semibold text-dev-heading flex items-center gap-1.5 text-xs">
                                <Lock className="w-3.5 h-3.5 text-dev-accent" />
                                1. GitHub App &amp; CSRF Defense
                            </span>
                            <p className="text-dev-textMuted text-[11px]">
                                Cryptographic state verification with timingSafeEqual prevents cross-site request forgery attacks.
                            </p>
                        </div>

                        <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                            <span className="font-semibold text-dev-heading flex items-center gap-1.5 text-xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-dev-blue" />
                                2. Neon Database Isolation
                            </span>
                            <p className="text-dev-textMuted text-[11px]">
                                Relational table with <code className="font-mono text-dev-text">user_id REFERENCES users(id)</code> ensures no cross-tenant leakage.
                            </p>
                        </div>

                        <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                            <span className="font-semibold text-dev-heading flex items-center gap-1.5 text-xs">
                                <RefreshCw className="w-3.5 h-3.5 text-dev-purple" />
                                3. Server-Only Secrets
                            </span>
                            <p className="text-dev-textMuted text-[11px]">
                                Private keys, tokens, and database credentials remain exclusively on Vercel Serverless Functions.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
