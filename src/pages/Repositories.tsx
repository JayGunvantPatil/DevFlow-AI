import React, { useState } from 'react';
import { GitBranch, Github, Info, Lock, CheckCircle2, RefreshCw } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

export const Repositories: React.FC = () => {
    const [showConnectModal, setShowConnectModal] = useState(false);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Empty State with Connect GitHub Button */}
            <EmptyState
                icon={GitBranch}
                badge="Phase 1 Placeholder"
                title="No repositories connected"
                description="Connect your GitHub organization or personal profile to synchronize source repositories, pull requests, and automated review branches."
                action={{
                    label: 'Connect GitHub',
                    icon: Github,
                    variant: 'primary',
                    onClick: () => setShowConnectModal(true),
                }}
                secondaryAction={{
                    label: 'Integration Documentation',
                    onClick: () => setShowConnectModal(true),
                }}
            />

            {/* Clear Architecture & Roadmap Panel */}
            <Card className="border-dev-borderHighlight/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-dev-blue" />
                        <CardTitle className="text-sm">Repository Architecture Roadmap (Phase 2)</CardTitle>
                    </div>
                    <CardDescription>
                        Why repository synchronization is currently an explicit placeholder
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-dev-text leading-relaxed">
                    <p>
                        In strict compliance with DevFlow AI Phase 1 specifications, we do not present fabricated GitHub repositories or mock OAuth tokens. Repository connectivity requires:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                            <span className="font-semibold text-dev-heading flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-dev-accent" />
                                1. GitHub App / OAuth
                            </span>
                            <p className="text-dev-textMuted text-[11px]">
                                Configured with read-only repository permissions and webhook event subscribers for PR review requests.
                            </p>
                        </div>

                        <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                            <span className="font-semibold text-dev-heading flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-dev-blue" />
                                2. Neon PostgreSQL Schema
                            </span>
                            <p className="text-dev-textMuted text-[11px]">
                                Relational tables storing organization ID, repo IDs, branch protection rules, and synced commit hashes.
                            </p>
                        </div>

                        <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                            <span className="font-semibold text-dev-heading flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 text-dev-purple" />
                                3. Webhook Dispatcher
                            </span>
                            <p className="text-dev-textMuted text-[11px]">
                                Vercel Serverless listener at <code className="text-dev-text font-mono">/api/webhooks/github</code> for real-time events.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* GitHub Connect Modal */}
            <Modal
                isOpen={showConnectModal}
                onClose={() => setShowConnectModal(false)}
                title="GitHub Integration Status"
                description="Phase 2 OAuth Web Application Flow"
                footer={
                    <Button variant="secondary" size="sm" onClick={() => setShowConnectModal(false)}>
                        Close
                    </Button>
                }
            >
                <div className="space-y-3 text-xs text-dev-text leading-relaxed">
                    <p>
                        You clicked <strong>Connect GitHub</strong>. In Phase 2, this triggers the GitHub OAuth flow:
                    </p>
                    <div className="bg-dev-bg p-3 rounded font-mono text-[11px] text-dev-blue border border-dev-border break-all">
                        https://github.com/login/oauth/authorize?client_id=...&amp;scope=repo,read:user
                    </div>
                    <p className="text-dev-textMuted">
                        For now, your local workspace operates in self-contained Phase 1 mode. All API and UI contracts are ready to receive the integration.
                    </p>
                </div>
            </Modal>
        </div>
    );
};
