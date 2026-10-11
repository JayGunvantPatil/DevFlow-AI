import React, { useState } from 'react';
import { MessageSquareCode, Sparkles, Send, Database } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const sampleQuestions = [
    'Where is the authentication bearer token validated in the API middleware?',
    'How does the serverless health check handle unsupported HTTP methods?',
    'What are the primary PostgreSQL schemas planned for Phase 2?',
    'Explain the project structure and directory conventions of DevFlow AI.',
];

export const RepositoryQA: React.FC = () => {
    const [query, setQuery] = useState('');
    const [selectedContext, setSelectedContext] = useState('all-projects');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Notice */}
            <div className="p-4 rounded-lg bg-dev-surface border border-dev-border flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-dev-purpleSubtle border border-purple-800/40 flex items-center justify-center shrink-0 text-dev-purple">
                    <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-dev-heading">
                            Repository Q&amp;A Engine (Phase 3 RAG Pipeline)
                        </h3>
                        <Badge variant="purple">Phase 3</Badge>
                    </div>
                    <p className="text-xs text-dev-textMuted leading-relaxed">
                        Vector embeddings, hybrid BM25 + pgvector retrieval, and AST symbol indexing are planned for Phase 3. The query interface below previews the future developer experience.
                    </p>
                </div>
            </div>

            {/* Query Bar */}
            <Card>
                <CardContent className="p-4 space-y-3">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Ask any question about codebase architecture, design patterns, or API endpoints..."
                                className="w-full h-10 px-4 rounded-md bg-dev-bg border border-dev-border text-xs text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-accent"
                            />
                        </div>
                        <select
                            value={selectedContext}
                            onChange={(e) => setSelectedContext(e.target.value)}
                            className="h-10 px-3 text-xs rounded-md bg-dev-bg border border-dev-border text-dev-text focus:outline-none focus:border-dev-accent hidden sm:block"
                        >
                            <option value="all-projects">All Projects (Global)</option>
                            <option value="devflow-core">devflow-core</option>
                            <option value="cloud-agent-runner">cloud-agent-runner</option>
                            <option value="syntax-analyzer">syntax-analyzer</option>
                        </select>
                        <Button
                            variant="primary"
                            size="md"
                            icon={Send}
                            disabled
                            title="Q&A RAG engine will be connected in Phase 3"
                        >
                            Ask
                        </Button>
                    </form>

                    {/* Sample Prompts */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="text-[11px] font-mono text-dev-textSubtle">SUGGESTED QUERIES:</span>
                        {sampleQuestions.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => setQuery(q)}
                                className="text-[11px] px-2 py-1 rounded bg-dev-subtle hover:bg-dev-surfaceHover text-dev-textMuted hover:text-dev-heading border border-dev-border transition-colors text-left"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Explanatory Empty State */}
            <EmptyState
                icon={MessageSquareCode}
                badge="Phase 3 Architecture"
                title="Knowledge Base Indexing in Progress"
                description="Once repository synchronization (Phase 2) and LLM embeddings (Phase 3) are active, you can query across functions, type definitions, architecture decisions, and git blame logs with source citations."
            />

            {/* Architectural Breakdown */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-dev-blue" />
                        <CardTitle className="text-sm">RAG Retrieval Pipeline Design</CardTitle>
                    </div>
                    <CardDescription>
                        Engine architecture planned for the repository Q&amp;A service
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-dev-text leading-relaxed">
                    <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                        <span className="font-semibold text-dev-heading">1. AST Chunking</span>
                        <p className="text-dev-textMuted text-[11px]">
                            Files are split along functional and class boundaries rather than naive character offsets, preserving syntax coherence.
                        </p>
                    </div>

                    <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                        <span className="font-semibold text-dev-heading">2. Vector Search</span>
                        <p className="text-dev-textMuted text-[11px]">
                            Embeddings stored in Neon PostgreSQL with pgvector cosine similarity indexes for sub-50ms context retrieval.
                        </p>
                    </div>

                    <div className="p-3 rounded-md bg-dev-subtle border border-dev-border space-y-1">
                        <span className="font-semibold text-dev-heading">3. Grounded Generation</span>
                        <p className="text-dev-textMuted text-[11px]">
                            Answers cite specific file paths and line number ranges with deep links into the repository viewer.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
