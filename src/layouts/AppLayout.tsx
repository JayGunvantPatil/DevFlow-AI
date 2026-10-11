import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Outlet } from 'react-router-dom';
import {
    LayoutDashboard,
    FolderGit2,
    GitBranch,
    CheckSquare,
    Sparkles,
    MessageSquareCode,
    Users,
    BarChart3,
    Settings,
    Bell,
    Search,
    ChevronRight,
    Menu,
    X,
    Activity,
    Terminal,
} from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { HealthCheckResult } from '../types';

interface NavItem {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
}

const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderGit2 },
    { name: 'Repositories', path: '/repositories', icon: GitBranch },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'AI Code Review', path: '/ai-review', icon: Sparkles, badge: 'Phase 3', badgeColor: 'bg-dev-purpleSubtle text-dev-purple border-purple-800/40' },
    { name: 'Repository Q&A', path: '/repo-qa', icon: MessageSquareCode, badge: 'Phase 3', badgeColor: 'bg-dev-purpleSubtle text-dev-purple border-purple-800/40' },
    { name: 'Team Workspace', path: '/workspace', icon: Users, badge: 'Phase 4', badgeColor: 'bg-dev-blueSubtle text-dev-blue border-blue-800/40' },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, badge: 'Preview', badgeColor: 'bg-dev-amberSubtle text-dev-amber border-amber-800/40' },
    { name: 'Settings', path: '/settings', icon: Settings },
];

const routeMetadata: Record<string, { title: string; description: string; breadcrumb: string }> = {
    '/': {
        title: 'Workspace Overview',
        description: 'Real-time telemetry, active repositories, and team task workflow.',
        breadcrumb: 'Dashboard',
    },
    '/projects': {
        title: 'Projects & Workspaces',
        description: 'Manage developer projects, repositories, and collaborative workspaces.',
        breadcrumb: 'Projects',
    },
    '/repositories': {
        title: 'Connected Repositories',
        description: 'Connect and synchronize source repositories with DevFlow AI.',
        breadcrumb: 'Repositories',
    },
    '/tasks': {
        title: 'Tasks & Sprints',
        description: 'Track developer issues, code refactors, and milestone deliveries.',
        breadcrumb: 'Tasks',
    },
    '/ai-review': {
        title: 'AI Code Review',
        description: 'Automated semantic code inspection, security checks, and diff analysis.',
        breadcrumb: 'AI Code Review',
    },
    '/repo-qa': {
        title: 'Repository Q&A',
        description: 'Natural language semantic search across codebase architecture and docs.',
        breadcrumb: 'Repository Q&A',
    },
    '/workspace': {
        title: 'Team Workspace',
        description: 'Real-time peer discussions, PR war rooms, and engineering coordination.',
        breadcrumb: 'Team Workspace',
    },
    '/analytics': {
        title: 'Developer Analytics',
        description: 'Review turnaround latency, PR velocity, and engineering efficiency metrics.',
        breadcrumb: 'Analytics',
    },
    '/settings': {
        title: 'Workspace Settings',
        description: 'Configure developer preferences, team profiles, and integration keys.',
        breadcrumb: 'Settings',
    },
};

export const AppLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);
    const [health, setHealth] = useState<HealthCheckResult>({
        data: null,
        latencyMs: null,
        error: null,
        loading: true,
        lastChecked: null,
    });

    const location = useLocation();
    const currentMeta = routeMetadata[location.pathname] || {
        title: 'DevFlow AI',
        description: 'Modern collaborative developer workspace',
        breadcrumb: 'Overview',
    };

    const fetchHealthStatus = async () => {
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
            const msg = typeof err === 'object' && err !== null && 'message' in err
                ? (err as { message: string }).message
                : 'Failed to connect to /api/health';
            const latency = typeof err === 'object' && err !== null && 'latencyMs' in err
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
    };

    useEffect(() => {
        fetchHealthStatus();
        // Poll API status every 45 seconds to keep dashboard live
        const interval = setInterval(fetchHealthStatus, 45000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-dev-bg text-dev-text flex flex-col md:flex-row">
            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/70 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Left Sidebar */}
            <aside
                className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-dev-surface border-r border-dev-border flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Brand Header */}
                <div className="h-16 px-5 border-b border-dev-border flex items-center justify-between">
                    <NavLink to="/" className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-lg bg-dev-subtle border border-dev-border flex items-center justify-center text-dev-accent group-hover:border-dev-accent transition-colors shadow-sm">
                            <Terminal className="w-4 h-4 text-dev-accent" />
                        </div>
                        <div>
                            <span className="font-semibold text-sm tracking-tight text-dev-heading flex items-center gap-1.5">
                                DevFlow <span className="text-dev-accent font-bold">AI</span>
                            </span>
                            <span className="block text-[10px] text-dev-textSubtle font-mono">Phase 1 Foundation</span>
                        </div>
                    </NavLink>

                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden text-dev-textMuted hover:text-dev-heading"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                    <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-dev-textSubtle">
                        Workspace
                    </div>

                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all group ${isActive
                                    ? 'bg-dev-subtle text-dev-heading border border-dev-border font-semibold shadow-xs'
                                    : 'text-dev-textMuted hover:text-dev-heading hover:bg-dev-surfaceHover'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon
                                        className={`w-4 h-4 transition-colors ${isActive ? 'text-dev-accent' : 'text-dev-textMuted group-hover:text-dev-text'
                                            }`}
                                    />
                                    <span>{item.name}</span>
                                </div>

                                {item.badge && (
                                    <span
                                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${item.badgeColor || 'bg-dev-subtle text-dev-textMuted border-dev-border'
                                            }`}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </div>

                {/* Sidebar Footer: System Status Pill */}
                <div className="p-3 border-t border-dev-border bg-dev-subtle/30">
                    <div className="rounded-md border border-dev-border bg-dev-surface p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-mono text-dev-textSubtle flex items-center gap-1.5">
                                <Activity className="w-3 h-3 text-dev-textMuted" />
                                Vercel API
                            </span>
                            <button
                                onClick={fetchHealthStatus}
                                title="Refresh API Health"
                                className="text-[10px] text-dev-textMuted hover:text-dev-heading underline"
                            >
                                refresh
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`w-2 h-2 rounded-full ${health.loading
                                        ? 'bg-amber-400 animate-pulse'
                                        : health.error
                                            ? 'bg-red-500'
                                            : 'bg-emerald-400'
                                        }`}
                                />
                                <span className="text-xs font-medium text-dev-heading">
                                    {health.loading ? 'Checking...' : health.error ? 'Offline' : 'Operational'}
                                </span>
                            </div>

                            {health.latencyMs !== null && (
                                <span className="text-[10px] font-mono text-dev-textSubtle">
                                    {health.latencyMs}ms
                                </span>
                            )}
                        </div>

                        {health.error && (
                            <p className="text-[10px] text-red-400 mt-1 truncate" title={health.error}>
                                {health.error}
                            </p>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Navigation Bar */}
                <header className="h-16 bg-dev-surface border-b border-dev-border px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden text-dev-textMuted hover:text-dev-heading p-1"
                            aria-label="Open sidebar menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Breadcrumb Navigation */}
                        <nav className="flex items-center text-xs text-dev-textMuted" aria-label="Breadcrumb">
                            <NavLink to="/" className="hover:text-dev-heading transition-colors">
                                DevFlow
                            </NavLink>
                            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-dev-textSubtle" />
                            <span className="text-dev-heading font-medium">{currentMeta.breadcrumb}</span>
                        </nav>
                    </div>

                    {/* Right Header Controls */}
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Search Field */}
                        <div className="relative hidden sm:block w-48 md:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-dev-textSubtle" />
                            <input
                                type="text"
                                placeholder="Search projects, PRs... (Ctrl+K)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-8 pl-8 pr-3 text-xs bg-dev-bg border border-dev-border rounded-md text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-borderHighlight focus:ring-1 focus:ring-dev-accent"
                            />
                        </div>

                        {/* Notification Icon */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="w-8 h-8 rounded-md border border-dev-border bg-dev-subtle hover:bg-dev-surfaceHover flex items-center justify-center text-dev-textMuted hover:text-dev-heading transition-colors relative"
                                aria-label="View notifications"
                            >
                                <Bell className="w-4 h-4" />
                                <span className="w-2 h-2 rounded-full bg-dev-blue absolute top-1.5 right-1.5" />
                            </button>

                            {/* Notification Popover */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-72 bg-dev-surface border border-dev-border rounded-lg shadow-dev-modal p-3 z-50 text-xs">
                                    <div className="flex items-center justify-between pb-2 border-b border-dev-border mb-2">
                                        <span className="font-semibold text-dev-heading">Notifications</span>
                                        <span className="text-[10px] text-dev-textSubtle">2 unread</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="p-2 rounded bg-dev-subtle/50 border border-dev-border/50">
                                            <p className="text-dev-heading font-medium">Phase 1 Deployed</p>
                                            <p className="text-[11px] text-dev-textMuted mt-0.5">Vercel serverless /api/health endpoint is online.</p>
                                        </div>
                                        <div className="p-2 rounded hover:bg-dev-subtle/30">
                                            <p className="text-dev-heading font-medium">GitHub OAuth</p>
                                            <p className="text-[11px] text-dev-textMuted mt-0.5">Integration scheduled for Phase 2.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Avatar & Menu */}
                        <div className="flex items-center gap-2 pl-2 border-l border-dev-border">
                            <img
                                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                                alt="User Avatar"
                                className="w-7 h-7 rounded-full border border-dev-border object-cover"
                            />
                            <div className="hidden lg:block text-left">
                                <span className="block text-xs font-medium text-dev-heading leading-tight">Sofia Chen</span>
                                <span className="block text-[10px] text-dev-textSubtle leading-tight">Lead Architect</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Title Header */}
                <div className="px-4 sm:px-6 py-5 bg-dev-bg border-b border-dev-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-dev-heading tracking-tight">
                                {currentMeta.title}
                            </h1>
                            <p className="text-xs text-dev-textMuted mt-0.5">
                                {currentMeta.description}
                            </p>
                        </div>

                        {/* Quick Status Pill */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-[11px] font-mono px-2 py-1 rounded bg-dev-surface border border-dev-border text-dev-textMuted flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-dev-accent" />
                                DevFlow Core v1.0.0
                            </span>
                        </div>
                    </div>
                </div>

                {/* Page Outlet */}
                <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
                    <Outlet context={{ health, onRefreshHealth: fetchHealthStatus }} />
                </main>
            </div>
        </div>
    );
};
