import React, { useState, useEffect, useCallback } from 'react';
import {
    CheckSquare,
    Plus,
    Search,
    CheckCircle2,
    Table as TableIcon,
    LayoutGrid,
    RefreshCw,
    AlertCircle,
    Trash2,
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus, Project } from '../types';
import { apiClient } from '../services/apiClient';
import { formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingIndicator } from '../components/ui/LoadingIndicator';
import { previewTasks, previewProjects } from '../lib/previewFixtures';

export const Tasks: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
    const [viewMode, setViewMode] = useState<'table' | 'board'>('table');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // New task form state
    const [newTitle, setNewTitle] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
    const [newStatus, setNewStatus] = useState<TaskStatus>('todo');

    const fetchTasksAndProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [tasksRes, projectsRes] = await Promise.all([
                apiClient.getTasks({
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
                    search: searchQuery.trim() || undefined,
                }),
                apiClient.getProjects(),
            ]);

            setTasks(tasksRes.tasks || []);
            setProjects(projectsRes.projects || []);
            if (projectsRes.projects && projectsRes.projects.length > 0 && !selectedProjectId) {
                setSelectedProjectId(projectsRes.projects[0].id);
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to load tasks from server';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, priorityFilter, searchQuery, selectedProjectId]);

    useEffect(() => {
        fetchTasksAndProjects();
    }, [fetchTasksAndProjects]);

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        if (!selectedProjectId && projects.length === 0) {
            setFormError('No projects available. Please create a project before adding tasks.');
            return;
        }

        const targetProjectId = selectedProjectId || (projects[0] && projects[0].id);
        if (!targetProjectId) {
            setFormError('Please select a project for this task.');
            return;
        }

        setIsSubmitting(true);
        setFormError(null);

        try {
            const res = await apiClient.createTask({
                projectId: targetProjectId,
                title: newTitle.trim(),
                status: newStatus,
                priority: newPriority,
            });

            setTasks((prev) => [res.task, ...prev]);
            setIsModalOpen(false);
            setNewTitle('');
        } catch (err: any) {
            setFormError(err.message || 'Failed to create task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTaskStatus = async (taskId: string) => {
        const targetTask = tasks.find((t) => t.id === taskId);
        if (!targetTask) return;

        const nextStatus: TaskStatus = targetTask.status === 'done' ? 'todo' : 'done';

        // Optimistic update
        setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
        );

        try {
            await apiClient.updateTask(taskId, { status: nextStatus });
        } catch (err: any) {
            // Rollback on failure
            setTasks((prev) =>
                prev.map((t) => (t.id === taskId ? { ...t, status: targetTask.status } : t))
            );
            alert(`Failed to update task status: ${err.message}`);
        }
    };

    const handleDeleteTask = async (id: string, title: string) => {
        if (!window.confirm(`Are you sure you want to delete task "${title}"?`)) {
            return;
        }
        setDeletingId(id);
        try {
            await apiClient.deleteTask(id);
            setTasks((prev) => prev.filter((t) => t.id !== id));
        } catch (err: any) {
            alert(`Failed to delete task: ${err.message}`);
        } finally {
            setDeletingId(null);
        }
    };

    const loadPreviewData = () => {
        setTasks(previewTasks);
        setProjects(previewProjects);
        setError(null);
    };

    const filteredTasks = tasks.filter((task) => {
        const matchesSearch =
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.projectName && task.projectName.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dev-textSubtle" />
                    <input
                        type="text"
                        placeholder="Search tasks or projects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 text-xs bg-dev-surface border border-dev-border rounded-md text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-borderHighlight focus:ring-1 focus:ring-dev-accent"
                    />
                </div>

                {/* View Toggle & Add Button */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="md"
                        icon={RefreshCw}
                        loading={isLoading}
                        onClick={() => fetchTasksAndProjects()}
                        title="Refresh tasks from database"
                    >
                        Refresh
                    </Button>

                    <div className="flex items-center p-0.5 rounded-md bg-dev-surface border border-dev-border">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded text-xs transition-colors ${viewMode === 'table'
                                    ? 'bg-dev-subtle text-dev-heading'
                                    : 'text-dev-textMuted hover:text-dev-heading'
                                }`}
                            title="Table View"
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-1.5 rounded text-xs transition-colors ${viewMode === 'board'
                                    ? 'bg-dev-subtle text-dev-heading'
                                    : 'text-dev-textMuted hover:text-dev-heading'
                                }`}
                            title="Board View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>

                    <Button
                        variant="primary"
                        size="md"
                        icon={Plus}
                        onClick={() => {
                            setFormError(null);
                            setIsModalOpen(true);
                        }}
                    >
                        New Task
                    </Button>
                </div>
            </div>

            {/* Database Error Banner */}
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
                        <Button variant="secondary" size="sm" onClick={() => fetchTasksAndProjects()}>
                            Retry Connection
                        </Button>
                        <Button variant="ghost" size="sm" onClick={loadPreviewData}>
                            Load Preview Data
                        </Button>
                    </div>
                </div>
            )}

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-dev-surface border border-dev-border text-xs">
                {/* Status Filter */}
                <div className="flex items-center gap-1 overflow-x-auto">
                    <span className="text-[11px] text-dev-textSubtle mr-2 font-mono">STATUS:</span>
                    {(['all', 'todo', 'in_progress', 'review', 'done'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${statusFilter === s
                                    ? 'bg-dev-subtle text-dev-heading border border-dev-border font-medium'
                                    : 'text-dev-textMuted hover:text-dev-heading'
                                }`}
                        >
                            {s.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-dev-textSubtle font-mono">PRIORITY:</span>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as any)}
                        className="h-7 px-2 text-xs rounded bg-dev-bg border border-dev-border text-dev-text focus:outline-none focus:border-dev-accent"
                    >
                        <option value="all">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
            </div>

            {/* Content Rendering: Loading, Empty, Table, or Board */}
            {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                    <LoadingIndicator size="lg" label="Loading tasks from database..." />
                </div>
            ) : filteredTasks.length === 0 ? (
                <EmptyState
                    icon={CheckSquare}
                    title="No tasks match the selected filters"
                    description="Try relaxing your filters or create a new task to track developer progress."
                    action={{
                        label: 'Create Task',
                        icon: Plus,
                        onClick: () => {
                            setFormError(null);
                            setIsModalOpen(true);
                        },
                    }}
                />
            ) : viewMode === 'table' ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">Done</TableHead>
                            <TableHead>Task Title</TableHead>
                            <TableHead>Project</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Assignee</TableHead>
                            <TableHead className="text-right">Created</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTasks.map((task) => (
                            <TableRow key={task.id} className="group">
                                <TableCell>
                                    <button
                                        onClick={() => toggleTaskStatus(task.id)}
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${task.status === 'done'
                                                ? 'bg-dev-accent border-dev-accent text-white'
                                                : 'border-dev-border hover:border-dev-borderHighlight'
                                            }`}
                                    >
                                        {task.status === 'done' && <CheckCircle2 className="w-3 h-3 text-white" />}
                                    </button>
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`font-medium ${task.status === 'done'
                                                ? 'line-through text-dev-textSubtle'
                                                : 'text-dev-heading'
                                            }`}
                                    >
                                        {task.title}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-mono text-[11px] text-dev-textMuted">
                                        {task.projectName}
                                    </span>
                                </TableCell>
                                <TableCell>
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
                                </TableCell>
                                <TableCell>
                                    <span className="capitalize text-xs text-dev-textMuted">
                                        {task.status.replace('_', ' ')}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={task.assignee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                                            alt={task.assignee?.name || 'Assignee'}
                                            className="w-5 h-5 rounded-full border border-dev-border"
                                        />
                                        <span className="text-xs text-dev-text truncate max-w-[100px]">
                                            {task.assignee?.name || 'Sofia Chen'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-[11px] text-dev-textSubtle">
                                    {formatDate(task.createdAt)}
                                </TableCell>
                                <TableCell>
                                    <button
                                        onClick={() => handleDeleteTask(task.id, task.title)}
                                        disabled={deletingId === task.id}
                                        title="Delete task"
                                        className="p-1 text-dev-textSubtle hover:text-dev-red opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                /* Board Kanban View */
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {(['todo', 'in_progress', 'review', 'done'] as const).map((colStatus) => {
                        const colTasks = filteredTasks.filter((t) => t.status === colStatus);
                        return (
                            <div
                                key={colStatus}
                                className="bg-dev-surface/60 border border-dev-border rounded-lg p-3 space-y-3"
                            >
                                <div className="flex items-center justify-between pb-2 border-b border-dev-border">
                                    <span className="font-semibold text-xs capitalize text-dev-heading">
                                        {colStatus.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dev-subtle text-dev-textSubtle border border-dev-border">
                                        {colTasks.length}
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    {colTasks.map((task) => (
                                        <Card key={task.id} hover className="p-3 text-xs space-y-2 group">
                                            <div className="flex items-start justify-between gap-2">
                                                <span
                                                    className={`font-medium leading-tight line-clamp-2 ${task.status === 'done' ? 'line-through text-dev-textSubtle' : 'text-dev-heading'
                                                        }`}
                                                >
                                                    {task.title}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Badge
                                                        variant={
                                                            task.priority === 'urgent'
                                                                ? 'danger'
                                                                : task.priority === 'high'
                                                                    ? 'warning'
                                                                    : 'neutral'
                                                        }
                                                    >
                                                        {task.priority}
                                                    </Badge>
                                                    <button
                                                        onClick={() => handleDeleteTask(task.id, task.title)}
                                                        disabled={deletingId === task.id}
                                                        title="Delete task"
                                                        className="p-0.5 text-dev-textSubtle hover:text-dev-red opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-1 text-[11px] text-dev-textSubtle">
                                                <span className="font-mono text-[10px]">{task.projectName}</span>
                                                <img
                                                    src={task.assignee?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                                                    alt={task.assignee?.name || 'Assignee'}
                                                    className="w-4 h-4 rounded-full border border-dev-border"
                                                />
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Task Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Task"
                description="Add a task or issue directly to Neon PostgreSQL"
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
                            onClick={handleCreateTask}
                        >
                            Save Task
                        </Button>
                    </>
                }
            >
                <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
                    {formError && (
                        <div className="p-2.5 rounded bg-dev-surface border border-dev-red/30 text-dev-red text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-dev-heading mb-1">
                            Task Title <span className="text-dev-red">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Implement RFC 7807 error responses in API"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            className="w-full h-8 px-3 rounded-md bg-dev-bg border border-dev-border text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-accent"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-dev-heading mb-1">
                                Linked Project <span className="text-dev-red">*</span>
                            </label>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="w-full h-8 px-2 rounded-md bg-dev-bg border border-dev-border text-dev-text focus:outline-none focus:border-dev-accent"
                            >
                                {projects.length === 0 ? (
                                    <option value="">No projects found (create one first)</option>
                                ) : (
                                    projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-dev-heading mb-1">Priority</label>
                            <select
                                value={newPriority}
                                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                                className="w-full h-8 px-2 rounded-md bg-dev-bg border border-dev-border text-dev-text focus:outline-none focus:border-dev-accent"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-dev-heading mb-1">Status</label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value as TaskStatus)}
                                className="w-full h-8 px-2 rounded-md bg-dev-bg border border-dev-border text-dev-text focus:outline-none focus:border-dev-accent"
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
