import React, { useState } from 'react';
import { Users, Hash, Send, Radio, Plus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface Message {
    id: string;
    sender: string;
    avatar: string;
    time: string;
    content: string;
    role: string;
}

const sampleMessages: Message[] = [
    {
        id: 'm1',
        sender: 'Elena Rostova',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        time: '10:14 AM',
        role: 'Principal Engineer',
        content: 'Just deployed the Vercel serverless /api/health endpoint. Clean 200 responses with telemetry metadata.',
    },
    {
        id: 'm2',
        sender: 'Sofia Chen',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        time: '10:18 AM',
        role: 'Lead Architect',
        content: 'Awesome! The UI layout and client connectivity checks are completely in sync with the design system.',
    },
    {
        id: 'm3',
        sender: 'Marcus Vance',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
        time: '10:25 AM',
        role: 'Backend Engineer',
        content: 'Preparing the Neon PostgreSQL DDL migration scripts for Phase 2. Tables for projects, tasks, and audit logs are ready.',
    },
];

export const TeamWorkspace: React.FC = () => {
    const [activeChannel, setActiveChannel] = useState('general');
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<Message[]>(sampleMessages);

    const channels = [
        { id: 'general', name: 'general', desc: 'Team-wide announcements' },
        { id: 'dev-core', name: 'devflow-core', desc: 'Core framework development' },
        { id: 'pr-reviews', name: 'pr-reviews', desc: 'Code review discussion' },
        { id: 'infra', name: 'cloud-infra', desc: 'Vercel & Neon deployments' },
    ];

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim()) return;

        const newMsg: Message = {
            id: `m-${Date.now()}`,
            sender: 'Sofia Chen',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            role: 'Lead Architect',
            content: messageInput.trim(),
        };

        setMessages([...messages, newMsg]);
        setMessageInput('');
    };

    return (
        <div className="space-y-4 max-w-6xl mx-auto">
            {/* Real-time Notice */}
            <div className="p-3 px-4 rounded-lg bg-dev-surface border border-dev-border flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-dev-blue animate-pulse" />
                    <span className="font-semibold text-dev-heading">Real-Time Messaging Engine</span>
                    <span className="text-dev-textMuted hidden sm:inline">
                        — Socket.IO / WebSockets synchronization planned for Phase 4.
                    </span>
                </div>
                <Badge variant="info">Phase 4</Badge>
            </div>

            {/* Chat Workspace Shell */}
            <div className="h-[620px] rounded-xl border border-dev-border bg-dev-surface flex overflow-hidden shadow-dev-card">
                {/* Left: Channels Sidebar */}
                <div className="w-56 shrink-0 bg-dev-subtle/50 border-r border-dev-border flex flex-col justify-between">
                    <div>
                        <div className="p-3 border-b border-dev-border flex items-center justify-between">
                            <span className="text-xs font-semibold text-dev-heading flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-dev-textMuted" />
                                Channels
                            </span>
                            <button className="text-dev-textMuted hover:text-dev-heading" title="Create channel (Phase 4)">
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="p-2 space-y-0.5">
                            {channels.map((ch) => (
                                <button
                                    key={ch.id}
                                    onClick={() => setActiveChannel(ch.id)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${activeChannel === ch.id
                                        ? 'bg-dev-surface text-dev-heading font-medium border border-dev-border'
                                        : 'text-dev-textMuted hover:text-dev-heading hover:bg-dev-surfaceHover'
                                        }`}
                                >
                                    <Hash className="w-3.5 h-3.5 text-dev-textSubtle" />
                                    <span className="truncate">{ch.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 border-t border-dev-border text-[11px] text-dev-textSubtle">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            3 engineers online
                        </span>
                    </div>
                </div>

                {/* Right: Message Feed */}
                <div className="flex-1 flex flex-col min-w-0 bg-dev-bg/40">
                    {/* Channel Header */}
                    <div className="p-3.5 px-5 border-b border-dev-border flex items-center justify-between bg-dev-surface">
                        <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-dev-textSubtle" />
                            <span className="text-xs font-semibold text-dev-heading">#{activeChannel}</span>
                            <span className="text-[11px] text-dev-textSubtle hidden sm:inline">
                                · {channels.find((c) => c.id === activeChannel)?.desc}
                            </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dev-subtle text-dev-textSubtle border border-dev-border">
                            Interactive Preview
                        </span>
                    </div>

                    {/* Message List */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className="flex items-start gap-3 text-xs">
                                <img
                                    src={msg.avatar}
                                    alt={msg.sender}
                                    className="w-7 h-7 rounded-full border border-dev-border shrink-0 mt-0.5"
                                />
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-semibold text-dev-heading">{msg.sender}</span>
                                        <span className="text-[10px] text-dev-textSubtle">{msg.role}</span>
                                        <span className="text-[10px] text-dev-textSubtle font-mono">{msg.time}</span>
                                    </div>
                                    <p className="text-dev-text leading-relaxed bg-dev-surface p-2.5 rounded-lg border border-dev-border/70 inline-block">
                                        {msg.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-dev-surface border-t border-dev-border flex gap-2">
                        <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder={`Message #${activeChannel}...`}
                            className="flex-1 h-9 px-3.5 rounded-md bg-dev-bg border border-dev-border text-xs text-dev-text placeholder-dev-textSubtle focus:outline-none focus:border-dev-accent"
                        />
                        <Button variant="primary" size="sm" icon={Send} type="submit">
                            Send
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
