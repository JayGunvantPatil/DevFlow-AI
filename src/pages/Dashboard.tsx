import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
    FolderGit2,
    GitBranch,
    CheckSquare,
    Sparkles,
    Github,
    ArrowUpRight,
    Clock,
    Server,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Info,
} from 'lucide-react';
import { HealthCheckResult, Project, Task } from '../types';
import { apiClient } from '../services/apiClient';
import { initialProjects, initialTasks, initialActivities } from '../lib/mockData';
import { formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

interface DashboardContext {
    health?: HealthCheckResult;
    onRefreshHealth?: () => void;
}

const defaultHealth: HealthCheckResult = {
    data: null,
    latencyMs: null,
    error: null,
    loading: false,
    lastChecked: null,
};

export const Dashboard: React.FC = () => {
    const outletContext = useOutletContext<DashboardContext | undefined>();
    const health = outletContext?.health || defaultHealth;
    const onRefreshHealth = outletContext?.onRefreshHealth || (() => {});
    const [projects, setProjects] = useState<Project[]>(initialProjects);
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [showGithubModal, setShowGithubModal] = useState(false);

    useEffect(() => {
        let isMounted = true;
        Promise.all([
            apiClient.getProjects().catch(() => null),
            apiClient.getTasks().catch(() => null),
        ]).then(([pRes, tRes]) => {
            if (isMounted) {
                if (pRes?.projects && pRes.projects.length > 0) {
                    setProjects(pRes.projects);
                }
                if (tRes?.tasks && tRes.tasks.length > 0) {
                    setTasks(tRes.tasks);
                }
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    const toggleTaskStatus = async (taskId: string) => {
        const target = tasks.find((t) => t.id === taskId);
        if (!target) return;
        const nextStatus = target.status === 'done' ? 'todo' : 'done';

        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
        );

        try {
            await apiClient.updateTask(taskId, { status: nextStatus });
        } catch {
            // Keep local state in preview mode
        }
    };

    const openTasksCount = tasks.filter((t) => t.status !== 'done').length;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* A. Welcome Section */}
            <div className="relative overflow-hidden rounded-xl border border-dev-border bg-gradient-to-r from-dev-surface via-dev-surface to-dev-subtle p-6 sm:p-8">
                <div className="max-w-2xl space-y-3">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-dev-accentSubtle border border-dev-accent/30 text-xs font-mono text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        DevFlow AI Phase 1 Foundation Active
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-dev-heading tracking-tight">
                        Developer workspace ready for collaboration
                    </h2>
                    <p className="text-xs sm:text-sm text-dev-textMuted leading-relaxed">
                        Manage projects, organize tasks, and inspect live serverless endpoints. GitHub synchronization and automated AI code review engines are scheduled for Phase 2 and 3.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                        <Button
                            variant="primary"
                            size="md"
                            icon={Github}
                            onClick={() => setShowGithubModal(true)}
                        >
                            Connect GitHub
                        </Button>
                        <Link to="/projects">
                            <Button variant="secondary" size="md" icon={FolderGit2}>
                                View Projects
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* B. Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Projects */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-dev-textMuted">Total Projects</span>
                            <div className="w-8 h-8 rounded-md bg-dev-subtle flex items-center justify-center text-dev-text">
                                <FolderGit2 className="w-4 h-4 text-dev-blue" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-dev-heading">{projects.length}</span>
                            <span className="text-[11px] text-dev-textSubtle block mt-0.5">3 active · 1 archived</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Connected Repositories */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-dev-textMuted">Connected Repositories</span>
                            <div className="w-8 h-8 rounded-md bg-dev-subtle flex items-center justify-center text-dev-text">
                                <GitBranch className="w-4 h-4 text-emerald-400" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-dev-heading">0</span>
                            <span className="text-[11px] text-amber-400/90 block mt-0.5">Requires GitHub OAuth (Phase 2)</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Open Tasks */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-dev-textMuted">Open Tasks</span>
                            <div className="w-8 h-8 rounded-md bg-dev-subtle flex items-center justify-center text-dev-text">
                                <CheckSquare className="w-4 h-4 text-dev-purple" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-dev-heading">{openTasksCount}</span>
                            <span className="text-[11px] text-dev-textSubtle block mt-0.5">
                                {tasks.length - openTasksCount} completed
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Reviews */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-dev-textMuted">AI Reviews</span>
                            <div className="w-8 h-8 rounded-md bg-dev-subtle flex items-center justify-center text-dev-text">
                                <Sparkles className="w-4 h-4 text-dev-accent" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-dev-heading">0</span>
                            <span className="text-[11px] text-dev-purple block mt-0.5">Planned for Phase 3</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Live Backend Telemetry & Status Card */}
            <Card className="border-dev-borderHighlight/70 bg-dev-surface/90">
                <CardHeader className="py-4">
                    <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-dev-accent" />
                        <CardTitle className="text-sm">Vercel Serverless Backend Telemetry</CardTitle>
                        <Badge variant={health.error ? 'danger' : 'success'} dot>
                            {health.loading ? 'Checking' : health.error ? 'Offline' : 'Operational'}
                        </Badge>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={RefreshCw}
                        loading={health.loading}
                        onClick={onRefreshHealth}
                    >
                        Ping /api/health
                    </Button>
                </CardHeader>
                <CardContent className="p-5 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div className="p-3 rounded-md bg-dev-subtle/50 border border-dev-border">
                            <span className="text-dev-textSubtle block text-[11px]">Endpoint Status</span>
                            <span className="text-dev-heading font-semibold mt-1 flex items-center gap-1.5">
                                {health.error ? (
                                    <>
                                        <AlertTriangle className="w-3.5 h-3.5 text-dev-red" />
                                        Failed to reach API
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-dev-accent" />
                                        200 OK — Ready
                                    </>
                                )}
                            </span>
                        </div>

                        <div className="p-3 rounded-md bg-dev-subtle/50 border border-dev-border">
                            <span className="text-dev-textSubtle block text-[11px]">Response Latency</span>
                            <span className="text-dev-heading font-mono font-medium mt-1 block">
                                {health.latencyMs !== null ? `${health.latencyMs} ms` : 'Measuring...'}
                            </span>
                        </div>

                        <div className="p-3 rounded-md bg-dev-subtle/50 border border-dev-border">
                            <span className="text-dev-textSubtle block text-[11px]">Uptime / Environment</span>
                            <span className="text-dev-heading font-mono text-[11px] mt-1 block truncate">
                                {health.data
                                    ? `${health.data.uptime}s · ${health.data.environment}`
                                    : '—'}
                            </span>
                        </div>

                        <div className="p-3 rounded-md bg-dev-subtle/50 border border-dev-border">
                            <span className="text-dev-textSubtle block text-[11px]">Server Timestamp</span>
                            <span className="text-dev-heading font-mono text-[11px] mt-1 block truncate">
                                {health.data?.timestamp ? new Date(health.data.timestamp).toLocaleTimeString() : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Planned Services Notice */}
                    {health.data?.services && (
                        <div className="mt-4 pt-3 border-t border-dev-border flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-dev-textMuted">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                                <span><strong>Database:</strong> {health.data.services.database}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-400/80" />
                                <span><strong>AI Engine:</strong> {health.data.services.ai}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-400/80" />
                                <span><strong>GitHub:</strong> {health.data.services.github}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Grid: Projects + Activity & Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* C. Recent Projects (2 cols on large screen) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Recent Projects</CardTitle>
                                <CardDescription>Active workspaces and repositories under development</CardDescription>
                            </div>
                            <Link to="/projects">
                                <Button variant="ghost" size="sm" icon={ArrowUpRight} iconPosition="right">
                                    All Projects
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-dev-border">
                            {projects.slice(0, 3).map((project) => (
                                <div
                                    key={project.id}
                                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-dev-surfaceHover transition-colors"
                                >
                                    <div className="space-y-1.5 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to="/projects"
                                                className="text-sm font-semibold text-dev-heading hover:text-dev-accent transition-colors truncate"
                                            >
                                                {project.name}
                                            </Link>
                                            <Badge
                                                variant={
                                                    project.status === 'active'
                                                        ? 'success'
                                                        : project.status === 'in_review'
                                                            ? 'warning'
                                                            : 'neutral'
                                                }
                                            >
                                                {project.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-dev-textMuted line-clamp-1">
                                            {project.description}
                                        </p>
                                        <div className="flex items-center gap-3 text-[11px] text-dev-textSubtle pt-1">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(project.lastActivity)}
                                            </span>
                                            <span>·</span>
                                            <span>{project.openTasksCount} open tasks</span>
                                            <span>·</span>
                                            <span className="font-mono">{project.tags.join(', ')}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                        <img
                                            src={project.lead.avatar}
                                            alt={project.lead.name}
                                            title={`Lead: ${project.lead.name}`}
                                            className="w-6 h-6 rounded-full border border-dev-border"
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* E. My Tasks Section */}
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>My Tasks</CardTitle>
                                <CardDescription>Assigned action items and pull request milestones</CardDescription>
                            </div>
                            <Link to="/tasks">
                                <Button variant="ghost" size="sm" icon={ArrowUpRight} iconPosition="right">
                                    Manage Tasks
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-dev-border">
                            {tasks.slice(0, 4).map((task) => (
                                <div
                                    key={task.id}
                                    className="p-4 px-5 flex items-start sm:items-center justify-between gap-3 hover:bg-dev-surfaceHover transition-colors"
                                >
                                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                                        <button
                                            onClick={() => toggleTaskStatus(task.id)}
                                            className={`w-4 h-4 mt-0.5 sm:mt-0 rounded border flex items-center justify-center shrink-0 transition-colors ${task.status === 'done'
                                                ? 'bg-dev-accent border-dev-accent text-white'
                                                : 'border-dev-border hover:border-dev-borderHighlight'
                                                }`}
                                            aria-label="Toggle task status"
                                        >
                                            {task.status === 'done' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </button>
                                        <div className="min-w-0">
                                            <p
                                                className={`text-xs font-medium leading-tight truncate ${task.status === 'done'
                                                    ? 'line-through text-dev-textSubtle'
                                                    : 'text-dev-heading'
                                                    }`}
                                            >
                                                {task.title}
                                            </p>
                                            <span className="text-[10px] text-dev-textSubtle font-mono">
                                                {task.projectName} · {formatDate(task.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                            variant={
                                                task.priority === 'urgent'
                                                    ? 'danger'
                                                    : task.priority === 'high'
                                                        ? 'warning'
                                                        : task.priority === 'medium'
                                                            ? 'info'
                                                            : 'neutral'
                                            }
                                        >
                                            {task.priority}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Activity Feed + Integration Placeholders */}
                <div className="space-y-6">
                    {/* D. Recent Activity Feed */}
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle className="text-sm">Recent Activity</CardTitle>
                                <CardDescription>Telemetry stream from active developer workspace</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {initialActivities.map((act) => (
                                <div key={act.id} className="flex items-start gap-3 text-xs">
                                    <img
                                        src={act.actor.avatar}
                                        alt={act.actor.name}
                                        className="w-6 h-6 rounded-full border border-dev-border shrink-0 mt-0.5"
                                    />
                                    <div className="space-y-0.5 min-w-0">
                                        <p className="text-dev-text">
                                            <span className="font-semibold text-dev-heading">{act.actor.name}</span>{' '}
                                            {act.detail}
                                        </p>
                                        <span className="text-[10px] text-dev-textSubtle block font-mono">
                                            {formatDate(act.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* F. GitHub Connection Card */}
                    <Card className="border-dev-border/70 bg-dev-subtle/30">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Github className="w-5 h-5 text-dev-text" />
                                <h4 className="text-xs font-semibold text-dev-heading">GitHub Integration (Phase 2)</h4>
                            </div>
                            <p className="text-xs text-dev-textMuted leading-relaxed">
                                Repository sync, webhook notifications, and automated PR review checks will be enabled after the Phase 2 OAuth handshake is established.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => setShowGithubModal(true)}
                            >
                                Learn About GitHub Sync
                            </Button>
                        </CardContent>
                    </Card>

                    {/* G. AI Insights Panel */}
                    <Card className="border-dev-border/70 bg-dev-subtle/30">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-dev-accent" />
                                <h4 className="text-xs font-semibold text-dev-heading">AI Engine (Phase 3 Roadmap)</h4>
                            </div>
                            <p className="text-xs text-dev-textMuted leading-relaxed">
                                Automated security diff audits, architectural Q&amp;A, and AST-aware suggestions will activate once our LLM serverless pipeline is connected.
                            </p>
                            <Link to="/ai-review" className="block">
                                <Button variant="secondary" size="sm" className="w-full text-xs">
                                    Preview AI Diff Inspector
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* GitHub Integration Modal */}
            <Modal
                isOpen={showGithubModal}
                onClose={() => setShowGithubModal(false)}
                title="Connect GitHub Integration"
                description="Planned integration for Phase 2 of DevFlow AI"
                footer={
                    <Button variant="secondary" size="sm" onClick={() => setShowGithubModal(false)}>
                        Close
                    </Button>
                }
            >
                <div className="space-y-4 text-xs text-dev-text">
                    <div className="p-3 rounded-lg bg-dev-subtle border border-dev-border flex items-start gap-3">
                        <Info className="w-4 h-4 text-dev-blue shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-dev-heading">Phase 1 Foundation Notice</p>
                            <p className="text-dev-textMuted mt-0.5">
                                GitHub OAuth tokens and repository webhook synchronization are not yet connected in Phase 1 to prevent unauthenticated secrets or mock data leakage.
                            </p>
                        </div>
                    </div>

                    <h4 className="font-semibold text-dev-heading pt-2">Scheduled Phase 2 Capabilities:</h4>
                    <ul className="list-disc pl-5 space-y-1.5 text-dev-textMuted">
                        <li>Secure GitHub OAuth 2.0 Web Application Flow.</li>
                        <li>Octokit repository discovery and pull request webhook listeners.</li>
                        <li>Neon PostgreSQL schema for persistent organization repos.</li>
                        <li>Branch protection rule checks and automated diff fetching.</li>
                    </ul>
                </div>
            </Modal>
        </div>
    );
};
