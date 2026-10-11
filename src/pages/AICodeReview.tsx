import React, { useState } from 'react';
import { Sparkles, FileCode, Lock, Code2 } from 'lucide-react';
import { sampleDiffPresets } from '../lib/mockData';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { DiffViewer } from '../components/ui/DiffViewer';
import { Badge } from '../components/ui/Badge';

export const AICodeReview: React.FC = () => {
    const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
    const [customDiff, setCustomDiff] = useState(sampleDiffPresets[0].diff);

    const handleSelectPreset = (idx: number) => {
        setSelectedPresetIndex(idx);
        setCustomDiff(sampleDiffPresets[idx].diff);
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Informative Banner */}
            <div className="p-4 rounded-lg bg-dev-surface border border-dev-border flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-dev-purpleSubtle border border-purple-800/40 flex items-center justify-center shrink-0 text-dev-purple">
                    <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-dev-heading">
                            AI Code Review Engine (Scheduled for Phase 3)
                        </h3>
                        <Badge variant="purple">Phase 3</Badge>
                    </div>
                    <p className="text-xs text-dev-textMuted leading-relaxed">
                        Automated semantic diff inspection, tokenized AST parsing, and security vulnerability detection are disabled until our LLM serverless pipeline is connected. Test the code diff viewer below with sample presets.
                    </p>
                </div>
            </div>

            {/* Preset Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-dev-surface border border-dev-border rounded-lg text-xs">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-dev-textSubtle">DIFF PRESET:</span>
                    <div className="flex flex-wrap gap-1.5">
                        {sampleDiffPresets.map((preset, idx) => (
                            <button
                                key={preset.name}
                                onClick={() => handleSelectPreset(idx)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedPresetIndex === idx
                                    ? 'bg-dev-subtle text-dev-heading border border-dev-border'
                                    : 'text-dev-textMuted hover:text-dev-heading'
                                    }`}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-[11px] text-dev-textSubtle font-mono">
                    Unified Git Format
                </div>
            </div>

            {/* Main Diff Work Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Input Textarea */}
                <Card className="flex flex-col">
                    <CardHeader className="py-3">
                        <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-dev-accent" />
                            <CardTitle className="text-xs">Git Patch / Diff Input</CardTitle>
                        </div>
                        <span className="text-[11px] text-dev-textSubtle font-mono">Editable</span>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 flex flex-col space-y-3">
                        <textarea
                            rows={14}
                            value={customDiff}
                            onChange={(e) => setCustomDiff(e.target.value)}
                            placeholder="Paste unified diff or patch here (lines starting with + or -)..."
                            className="w-full flex-1 p-3 rounded-md bg-dev-bg border border-dev-border font-mono text-xs text-dev-text leading-relaxed focus:outline-none focus:border-dev-accent resize-none"
                        />

                        <div className="flex items-center justify-between pt-2 border-t border-dev-border">
                            <span className="text-[11px] text-dev-textSubtle">
                                {customDiff.split('\n').length} lines in buffer
                            </span>

                            {/* Disabled Action as required */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    icon={Lock}
                                    disabled
                                    title="AI review backend disabled in Phase 1"
                                >
                                    Analyze with AI (Phase 3)
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Rendered Diff Viewer */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="py-3">
                            <div className="flex items-center gap-2">
                                <Code2 className="w-4 h-4 text-dev-blue" />
                                <CardTitle className="text-xs">Parsed Diff Preview</CardTitle>
                            </div>
                            <Badge variant="success">Syntax Formatted</Badge>
                        </CardHeader>
                        <CardContent className="p-4">
                            <DiffViewer
                                diff={customDiff}
                                filename={sampleDiffPresets[selectedPresetIndex]?.name}
                            />
                        </CardContent>
                    </Card>

                    {/* AI Capabilities Preview */}
                    <div className="p-4 rounded-lg bg-dev-subtle/40 border border-dev-border space-y-2 text-xs">
                        <h4 className="font-semibold text-dev-heading flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-dev-accent" />
                            Upcoming AI Analysis Checks:
                        </h4>
                        <ul className="space-y-1 text-dev-textMuted text-[11px]">
                            <li>✓ OWASP Security &amp; injection pattern detection</li>
                            <li>✓ N+1 database query and transaction leak identification</li>
                            <li>✓ TypeScript type soundness and runtime boundary verification</li>
                            <li>✓ Automated PR summary and architectural impact scoring</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
