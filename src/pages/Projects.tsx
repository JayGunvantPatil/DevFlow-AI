import React, { useState, useEffect, useCallback } from 'react';
import {
    FolderGit2,
    Plus,
    Search,
    Star,
    Clock,
    RefreshCw,
    AlertCircle,
    Trash2,
} from 'lucide-react';
import { Project, ProjectStatus } from '../types';
import { apiClient } from '../services/apiClient';
import { formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { previewProjects } from '../lib/previewFixtures';

export const Projects: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Form State
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newTags, setNewTags] = useState('TypeScript, React');
    const [newStatus, setNewStatus] = useState<ProjectStatus>('active');

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await apiClient.getProjects({
                status: statusFilter !== 'all' ? statusFilter : undefined,
                search: searchQuery.trim() || undefined,
            });
            setProjects(res.projects || []);
        } catch (err: any) {
            const msg = err.message || 'Failed to load projects from server';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setIsSubmitting(true);
        setFormError(null);

        try {
            const tagsArray = newTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            const res = await apiClient.createProject({
                name: newName.trim(),
                description: newDesc.trim(),
                status: newStatus as any,
                tags: tagsArray,
            });

            setProjects((prev) => [res.project, ...prev]);
            setIsModalOpen(false);
            setNewName('');
            setNewDesc('');
            setNewTags('TypeScript, React');
        } catch (err: any) {
            setFormError(err.message || 'Failed to create project');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteProject = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete project "${name}" and all its linked tasks?`)) {
            return;
        }
        setDeletingId(id);
        try {
            await apiClient.deleteProject(id);
            setProjects((prev) => prev.filter((p) => p.id !== id));
        } catch (err: any) {
            alert(`Failed to delete project: ${err.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    const loadPreviewData = () => {
        setProjects(previewProjects);
        setError(null);
    };

    const filteredProjects = projects.filter((proj) => {
        const matchesSearch =
            proj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            proj.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            proj.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesStatus = statusFilter === 'all' || proj.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dev-textSubtle" />
                    <input
                        type="text"
                        placeholder="Search projects by name, keyword, or tag..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 text-xs bg-dev-surface border border-dev-border rounded-md text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-borderHighlight focus:ring-1 focus:ring-dev-accent"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="md"
                        icon={RefreshCw}
                        loading={isLoading}
                        onClick={() => fetchProjects()}
                        title="Refresh from Neon DB"
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="primary"
                        size="md"
                        icon={Plus}
                        onClick={() => {
                            setFormError(null);
                            setIsModalOpen(true);
                        }}
                    >
                        New Project
                    </Button>
                </div>
            </div>

            {/* Database Error Banner if unconfigured or failed */}
            {error && (
                <div className="p-4 rounded-lg bg-dev-surface border border-dev-red/30 space-y-3">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-dev-red flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1 text-xs">
                            <h4 className="font-semibold text-dev-heading">Backend Database Notice</h4>
                            <p className="text-dev-textMuted leading-relaxed">{error}</p>
                            {error.includes('DATABASE_URL') && (
                                <div className="mt-2 p-2.5 rounded bg-dev-bg border border-dev-border text-[11px] font-mono space-y-1 text-dev-text">
                                    <div className="text-dev-textSubtle font-sans font-medium">To connect your Neon database:</div>
                                    <div>1. Set <code className="text-dev-accent">DATABASE_URL=postgres://...</code> in your <code className="text-amber-400">.env.local</code> file.</div>
                                    <div>2. Run <code className="text-dev-accent">migrations/001_init_projects_and_tasks.sql</code> in your Neon SQL Editor.</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pl-8">
                        <Button variant="secondary" size="sm" onClick={() => fetchProjects()}>
                            Retry Connection
                        </Button>
                        <Button variant="ghost" size="sm" onClick={loadPreviewData}>
                            Load Preview Data
                        </Button>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-dev-border pb-1 overflow-x-auto text-xs">
                {(['all', 'active', 'in_review', 'archived'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setStatusFilter(tab)}
                        className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${statusFilter === tab
                            ? 'bg-dev-subtle text-dev-heading border border-dev-border'
                            : 'text-dev-textMuted hover:text-dev-heading hover:bg-dev-surfaceHover'
                            }`}
                    >
                        {tab.replace('_', ' ')}
                        <span className="ml-1.5 text-[10px] text-dev-textSubtle">
                            ({tab === 'all' ? projects.length : projects.filter((p) => p.status === tab).length})
                        </span>
                    </button>
                ))}
            </div>

            {/* Content Rendering: Loading, Empty, or Grid */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <LoadingIndicator size="lg" label="Loading projects from database..." />
                </div>
            ) : filteredProjects.length === 0 ? (
                <EmptyState
                    icon={FolderGit2}
                    title="No projects found"
                    description={
                        searchQuery
                            ? `No projects matching "${searchQuery}". Try a different search keyword.`
                            : 'No projects recorded in the Neon database yet. Create your first project or run migrations/seed.sql.'
                    }
                    action={{
                        label: 'Create Project',
                        icon: Plus,
                        onClick: () => {
                            setFormError(null);
                            setIsModalOpen(true);
                        },
                    }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => (
                        <Card key={project.id} hover className="flex flex-col justify-between group">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-semibold text-dev-heading hover:text-dev-accent transition-colors truncate">
                                            {project.name}
                                        </h3>
                                        <p className="text-xs text-dev-textMuted mt-1 line-clamp-2 leading-relaxed">
                                            {project.description}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
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
                                        <button
                                            onClick={() => handleDeleteProject(project.id, project.name)}
                                            disabled={deletingId === project.id}
                                            title="Delete project"
                                            className="p-1 text-dev-textSubtle hover:text-dev-red opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1.5">
                                    {project.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-dev-subtle text-dev-textSubtle border border-dev-border"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                {/* Footer Metadata */}
                                <div className="pt-3 border-t border-dev-border/70 flex items-center justify-between text-[11px] text-dev-textSubtle">
                                    <div className="flex items-center gap-1.5">
                                        <img
                                            src={project.lead?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                                            alt={project.lead?.name || 'Lead'}
                                            title={`Lead: ${project.lead?.name}`}
                                            className="w-5 h-5 rounded-full border border-dev-border"
                                        />
                                        <span className="truncate max-w-[90px]">{project.lead?.name || 'Sofia Chen'}</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(project.lastActivity || project.createdAt || new Date().toISOString())}
                                        </span>
                                        {project.stars !== undefined && project.stars > 0 && (
                                            <span className="flex items-center gap-1 text-amber-400">
                                                <Star className="w-3 h-3 fill-amber-400" />
                                                {project.stars}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Project"
                description="Persist a new developer workspace directly to Neon PostgreSQL"
                footer={
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isSubmitting}
                            onClick={() => setIsModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            loading={isSubmitting}
                            onClick={handleCreateProject}
                        >
                            Save Project
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                    {formError && (
                        <div className="p-2.5 rounded bg-dev-surface border border-dev-red/30 text-dev-red text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-dev-heading mb-1">
                            Project Name <span className="text-dev-red">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. auth-gateway, semantic-parser"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full h-8 px-3 rounded-md bg-dev-bg border border-dev-border text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-accent"
                        />
                        <span className="text-[10px] text-dev-textSubtle mt-0.5 block">
                            Will be saved as unique project in PostgreSQL.
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-dev-heading mb-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Provide a concise summary of the module or service purpose."
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            className="w-full p-2.5 rounded-md bg-dev-bg border border-dev-border text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-accent"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-dev-heading mb-1">
                                Tags (comma separated)
                            </label>
                            <input
                                type="text"
                                placeholder="TypeScript, Rust, Docker"
                                value={newTags}
                                onChange={(e) => setNewTags(e.target.value)}
                                className="w-full h-8 px-3 rounded-md bg-dev-bg border border-dev-border text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-accent"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-dev-heading mb-1">
                                Initial Status
                            </label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as ProjectStatus)}
                                className="w-full h-8 px-2.5 rounded-md bg-dev-bg border border-dev-border text-dev-text focus:outline-none focus:border-dev-accent"
                            >
                                <option value="active">Active</option>
                                <option value="in_review">In Review</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
