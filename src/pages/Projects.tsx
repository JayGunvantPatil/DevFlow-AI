import React, { useState, useEffect, useCallback } from 'react';
import {
    FolderGit2,
    Plus,
    Search,
    Star,
    Clock,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    X,
    ShieldAlert,
    Trash2,
    Edit2,
    MoreVertical,
    AlertTriangle,
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
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
    const [createFormError, setCreateFormError] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newTags, setNewTags] = useState('TypeScript, React');
    const [newStatus, setNewStatus] = useState<ProjectStatus>('active');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editTags, setEditTags] = useState('');
    const [editStatus, setEditStatus] = useState<ProjectStatus>('active');
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);
    const [editFormError, setEditFormError] = useState<string | null>(null);

    // Three-dot Dropdown State
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Delete Confirmation Dialog State
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (activeMenuId && !(e.target as HTMLElement).closest('.project-menu-container')) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [activeMenuId]);

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
        const trimmedName = newName.trim();
        if (!trimmedName) {
            setCreateFormError('Project name is required');
            return;
        }
        if (trimmedName.length < 2 || trimmedName.length > 100) {
            setCreateFormError('Project name must be between 2 and 100 characters');
            return;
        }
        if (newDesc.length > 1000) {
            setCreateFormError('Description cannot exceed 1000 characters');
            return;
        }

        setIsCreateSubmitting(true);
        setCreateFormError(null);

        try {
            const tagsArray = newTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            const res = await apiClient.createProject({
                name: trimmedName,
                description: newDesc.trim(),
                status: newStatus as any,
                tags: tagsArray,
            });

            setProjects((prev) => [res.project, ...prev]);
            setIsCreateModalOpen(false);
            setNewName('');
            setNewDesc('');
            setNewTags('TypeScript, React');
            setSuccessMessage(`Project "${res.project.name}" created successfully`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setCreateFormError(err.message || 'Failed to create project');
        } finally {
            setIsCreateSubmitting(false);
        }
    };

    const handleOpenEditModal = (project: Project) => {
        setEditingProject(project);
        setEditName(project.name);
        setEditDesc(project.description || '');
        setEditTags(Array.isArray(project.tags) ? project.tags.join(', ') : '');
        setEditStatus(project.status || 'active');
        setEditFormError(null);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingProject(null);
        setEditFormError(null);
    };

    const handleSaveEditProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProject) return;

        const trimmedName = editName.trim();
        if (!trimmedName) {
            setEditFormError('Project name is required');
            return;
        }
        if (trimmedName.length < 2 || trimmedName.length > 100) {
            setEditFormError('Project name must be between 2 and 100 characters');
            return;
        }

        setIsEditSubmitting(true);
        setEditFormError(null);

        try {
            const tagsArray = editTags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);

            const res = await apiClient.updateProject(editingProject.id, {
                name: trimmedName,
                description: editDesc.trim(),
                status: editStatus,
                tags: tagsArray,
            });

            // Update in local state without full reload
            setProjects((prev) =>
                prev.map((p) =>
                    p.id === editingProject.id
                        ? {
                            ...p,
                            ...res.project,
                            openTasksCount: res.project.openTasksCount ?? p.openTasksCount,
                        }
                        : p
                )
            );

            setIsEditModalOpen(false);
            setEditingProject(null);
            setSuccessMessage(`Project "${res.project.name}" updated successfully`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setEditFormError(err.message || 'Failed to update project');
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const handleOpenDeleteDialog = (project: Project) => {
        setProjectToDelete(project);
        setDeleteError(null);
    };

    const handleConfirmDelete = async () => {
        if (!projectToDelete) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const deletedName = projectToDelete.name;
            await apiClient.deleteProject(projectToDelete.id);
            setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
            setProjectToDelete(null);
            setSuccessMessage(`Project "${deletedName}" deleted successfully`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setDeleteError(err.message || 'Failed to delete project');
        } finally {
            setIsDeleting(false);
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
            {/* Success Notification Banner */}
            {successMessage && (
                <div className="p-3 px-4 rounded-lg bg-dev-success/15 border border-dev-success/30 flex items-center justify-between text-xs text-dev-success animate-fadeIn">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-medium">{successMessage}</span>
                    </div>
                    <button
                        onClick={() => setSuccessMessage(null)}
                        className="hover:opacity-75 transition-opacity"
                        title="Dismiss"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
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
                            setCreateFormError(null);
                            setIsCreateModalOpen(true);
                        }}
                    >
                        New Project
                    </Button>
                </div>
            </div>

            {/* Database or Permission Error Banner */}
            {error && (
                <div className={`p-4 rounded-lg bg-dev-surface border ${error.toLowerCase().includes('forbidden') || error.toLowerCase().includes('permission') ? 'border-amber-500/40 bg-amber-500/5' : 'border-dev-red/30'} space-y-3`}>
                    <div className="flex items-start gap-3">
                        {error.toLowerCase().includes('forbidden') || error.toLowerCase().includes('permission') ? (
                            <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-dev-red flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-1 text-xs">
                            <h4 className="font-semibold text-dev-heading">
                                {error.toLowerCase().includes('forbidden') || error.toLowerCase().includes('permission')
                                    ? 'Access Restricted (403 Forbidden)'
                                    : 'Backend Service Notice'}
                            </h4>
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
                            setCreateFormError(null);
                            setIsCreateModalOpen(true);
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

                                        {/* Direct Edit Icon Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenEditModal(project);
                                            }}
                                            title="Edit project"
                                            aria-label={`Edit ${project.name}`}
                                            className="p-1 rounded text-dev-textSubtle hover:text-dev-heading hover:bg-dev-surfaceHover transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Three-dot Action Menu */}
                                        <div className="relative project-menu-container">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === project.id ? null : project.id);
                                                }}
                                                title="Project actions"
                                                aria-label={`Actions for ${project.name}`}
                                                className="p-1 rounded text-dev-textSubtle hover:text-dev-heading hover:bg-dev-surfaceHover transition-colors"
                                            >
                                                <MoreVertical className="w-3.5 h-3.5" />
                                            </button>

                                            {activeMenuId === project.id && (
                                                <div
                                                    className="absolute right-0 top-full mt-1 w-36 py-1 bg-dev-surface border border-dev-border rounded-md shadow-xl z-20 text-xs"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setActiveMenuId(null);
                                                            handleOpenEditModal(project);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-dev-text hover:text-dev-heading hover:bg-dev-subtle transition-colors"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-dev-accent" />
                                                        <span>Edit Project</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setActiveMenuId(null);
                                                            handleOpenDeleteDialog(project);
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-dev-red hover:bg-dev-red/10 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Delete Project</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Project"
                description="Persist a new developer workspace directly to Neon PostgreSQL"
                footer={
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isCreateSubmitting}
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            loading={isCreateSubmitting}
                            onClick={handleCreateProject}
                        >
                            Save Project
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
                    {createFormError && (
                        <div className="p-2.5 rounded bg-dev-surface border border-dev-red/30 text-dev-red text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{createFormError}</span>
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

            {/* Edit Project Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                title="Edit Project"
                description={`Modify workspace details for "${editingProject?.name || ''}"`}
                footer={
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isEditSubmitting}
                            onClick={handleCloseEditModal}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            loading={isEditSubmitting}
                            onClick={handleSaveEditProject}
                        >
                            Save Changes
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleSaveEditProject} className="space-y-4 text-xs">
                    {editFormError && (
                        <div className="p-2.5 rounded bg-dev-surface border border-dev-red/30 text-dev-red text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{editFormError}</span>
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
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full h-8 px-3 rounded-md bg-dev-bg border border-dev-border text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-accent"
                        />
                        <span className="text-[10px] text-dev-textSubtle mt-0.5 block">
                            Unique name for your workspace in Neon PostgreSQL.
                        </span>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-dev-heading mb-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Provide a concise summary of the module or service purpose."
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
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
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                className="w-full h-8 px-3 rounded-md bg-dev-bg border border-dev-border text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-accent"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-dev-heading mb-1">
                                Status
                            </label>
                            <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
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

            {/* Delete Project Confirmation Modal */}
            <Modal
                isOpen={!!projectToDelete}
                onClose={() => !isDeleting && setProjectToDelete(null)}
                title="Delete Project"
                description={`Are you sure you want to delete "${projectToDelete?.name}"?`}
                footer={
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => setProjectToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            loading={isDeleting}
                            onClick={handleConfirmDelete}
                        >
                            Delete Project
                        </Button>
                    </>
                }
            >
                <div className="space-y-3 text-xs">
                    {deleteError && (
                        <div className="p-2.5 rounded bg-dev-surface border border-dev-red/30 text-dev-red text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{deleteError}</span>
                        </div>
                    )}

                    <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                        <div className="space-y-1">
                            <p className="font-semibold text-amber-200">Database Cascade Notice</p>
                            <p className="leading-relaxed">
                                {projectToDelete?.openTasksCount && projectToDelete.openTasksCount > 0 ? (
                                    <>
                                        This project currently has <strong className="text-white">{projectToDelete.openTasksCount} active task(s)</strong>.
                                        Deleting this project will permanently remove it along with all linked tasks from Neon PostgreSQL.
                                    </>
                                ) : (
                                    <>
                                        Deleting this project will permanently remove it from Neon PostgreSQL.
                                        Any associated tasks will also be removed.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    <p className="text-dev-textMuted">
                        This action cannot be undone. Please confirm you wish to delete this project workspace.
                    </p>
                </div>
            </Modal>
        </div>
    );
};
