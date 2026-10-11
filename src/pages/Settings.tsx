import React, { useState } from 'react';
import { Moon, User, Key, Database, Github, Check, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const SettingsPage: React.FC = () => {
    const [name, setName] = useState('Sofia Chen');
    const [email, setEmail] = useState('sofia.chen@devflow.local');
    const [savedNotice, setSavedNotice] = useState(false);
    const [themeOption, setThemeOption] = useState<'charcoal' | 'pitch' | 'dim'>('charcoal');

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {savedNotice && (
                <div className="p-3 px-4 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    Settings updated successfully.
                </div>
            )}

            {/* Profile Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-dev-accent" />
                        <CardTitle className="text-sm">Developer Profile</CardTitle>
                    </div>
                    <CardDescription>Manage your workspace identity and credentials</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                    <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                        <div className="flex items-center gap-4">
                            <img
                                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
                                alt="Sofia Chen"
                                className="w-14 h-14 rounded-full border-2 border-dev-border object-cover"
                            />
                            <div>
                                <Button variant="secondary" size="sm" type="button">
                                    Change Avatar
                                </Button>
                                <span className="block text-[11px] text-dev-textSubtle mt-1">
                                    JPG, GIF or PNG. Max size 2MB.
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-dev-heading mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-8 px-3 rounded-md bg-dev-bg border border-dev-border text-dev-text focus:outline-none focus:border-dev-accent"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-dev-heading mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-8 px-3 rounded-md bg-dev-bg border border-dev-border text-dev-text focus:outline-none focus:border-dev-accent"
                                />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button variant="primary" size="sm" type="submit">
                                Save Profile
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Appearance Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-dev-blue" />
                        <CardTitle className="text-sm">Appearance &amp; Dark Theme</CardTitle>
                    </div>
                    <CardDescription>Tailor your preferred developer contrast palette</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                            { id: 'charcoal', name: 'GitHub Charcoal', desc: 'Default #0d1117 palette' },
                            { id: 'pitch', name: 'OLED Pitch Black', desc: 'High contrast #000000' },
                            { id: 'dim', name: 'Linear Slate Dim', desc: 'Muted #12151c panel' },
                        ].map((th) => (
                            <button
                                key={th.id}
                                type="button"
                                onClick={() => setThemeOption(th.id as any)}
                                className={`p-3 rounded-lg border text-left transition-all ${themeOption === th.id
                                    ? 'border-dev-accent bg-dev-accentSubtle'
                                    : 'border-dev-border bg-dev-subtle/50 hover:bg-dev-surfaceHover'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-dev-heading">{th.name}</span>
                                    {themeOption === th.id && (
                                        <span className="w-2 h-2 rounded-full bg-dev-accent" />
                                    )}
                                </div>
                                <span className="text-[11px] text-dev-textSubtle">{th.desc}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Integrations Keys Placeholder (Phase 2 & 3) */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-dev-purple" />
                        <CardTitle className="text-sm">Future API Credentials &amp; Secrets</CardTitle>
                    </div>
                    <CardDescription>
                        Secure environment placeholders for future phases. Never committed to client bundles.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                    <div className="space-y-3">
                        <div className="p-3 rounded-md bg-dev-bg border border-dev-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Github className="w-4 h-4 text-dev-text" />
                                <div>
                                    <span className="font-semibold text-dev-heading block">GitHub Client Secret</span>
                                    <span className="text-[11px] text-dev-textSubtle">Phase 2 OAuth Web App</span>
                                </div>
                            </div>
                            <Badge variant="neutral">Configured in Vercel Env</Badge>
                        </div>

                        <div className="p-3 rounded-md bg-dev-bg border border-dev-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Database className="w-4 h-4 text-dev-blue" />
                                <div>
                                    <span className="font-semibold text-dev-heading block">Neon PostgreSQL Database URL</span>
                                    <span className="text-[11px] text-dev-textSubtle">Phase 2 Relational persistence</span>
                                </div>
                            </div>
                            <Badge variant="neutral">DATABASE_URL in .env</Badge>
                        </div>

                        <div className="p-3 rounded-md bg-dev-bg border border-dev-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Shield className="w-4 h-4 text-dev-accent" />
                                <div>
                                    <span className="font-semibold text-dev-heading block">LLM API Key (OpenAI / Anthropic)</span>
                                    <span className="text-[11px] text-dev-textSubtle">Phase 3 AI code analysis pipeline</span>
                                </div>
                            </div>
                            <Badge variant="purple">Phase 3</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
