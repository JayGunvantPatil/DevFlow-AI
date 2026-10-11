import React from 'react';
import { TrendingUp, Clock, GitPullRequest, AlertCircle, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export const Analytics: React.FC = () => {
    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Explicit Disclaimer Banner */}
            <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-300">
                            Sample Data Preview Notice
                        </span>
                        <Badge variant="warning">Sample Preview</Badge>
                    </div>
                    <p className="text-amber-200/70 leading-relaxed">
                        The telemetry graphs below illustrate the visual layout for Developer Velocity and Code Review Turnaround. In Phase 1, live metrics require active GitHub webhooks and Neon PostgreSQL historical data aggregation. These figures are not fabricated live usage.
                    </p>
                </div>
            </div>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between text-xs text-dev-textMuted">
                            <span>Avg. Review Turnaround</span>
                            <Clock className="w-4 h-4 text-dev-blue" />
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-dev-heading">2.4 hrs</span>
                            <span className="text-[11px] text-emerald-400 block mt-0.5 font-mono">
                                Sample preview target
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between text-xs text-dev-textMuted">
                            <span>PR Merge Velocity</span>
                            <GitPullRequest className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-dev-heading">18 / week</span>
                            <span className="text-[11px] text-dev-textSubtle block mt-0.5 font-mono">
                                Sample baseline
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between text-xs text-dev-textMuted">
                            <span>AST Token Density</span>
                            <TrendingUp className="w-4 h-4 text-dev-purple" />
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-dev-heading">94.2%</span>
                            <span className="text-[11px] text-dev-textSubtle block mt-0.5 font-mono">
                                Semantic coverage
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between text-xs text-dev-textMuted">
                            <span>AI Review Accuracy</span>
                            <Sparkles className="w-4 h-4 text-dev-accent" />
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-bold text-dev-heading">—</span>
                            <span className="text-[11px] text-dev-purple block mt-0.5 font-mono">
                                Phase 3 benchmark
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Visual Chart Bars (Clean CSS Developer Chart) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle className="text-sm">Pull Request Cycle Time (Sample)</CardTitle>
                            <CardDescription>Simulated weekly turnaround time in hours</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="space-y-3">
                            {[
                                { day: 'Mon', hours: 3.2, percentage: '60%' },
                                { day: 'Tue', hours: 2.1, percentage: '40%' },
                                { day: 'Wed', hours: 1.8, percentage: '32%' },
                                { day: 'Thu', hours: 2.8, percentage: '52%' },
                                { day: 'Fri', hours: 3.9, percentage: '75%' },
                            ].map((item) => (
                                <div key={item.day} className="space-y-1 text-xs">
                                    <div className="flex justify-between text-[11px] text-dev-textMuted font-mono">
                                        <span>{item.day}</span>
                                        <span>{item.hours}h avg</span>
                                    </div>
                                    <div className="h-2 w-full bg-dev-subtle rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-dev-accent rounded-full"
                                            style={{ width: item.percentage }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle className="text-sm">Commit &amp; Issue Volume (Sample)</CardTitle>
                            <CardDescription>Simulated project activity distribution</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="space-y-3">
                            {[
                                { name: 'devflow-core', count: 42, percentage: '80%', color: 'bg-dev-blue' },
                                { name: 'syntax-analyzer', count: 28, percentage: '55%', color: 'bg-dev-purple' },
                                { name: 'cloud-agent-runner', count: 19, percentage: '38%', color: 'bg-emerald-400' },
                                { name: 'docs-portal', count: 8, percentage: '16%', color: 'bg-amber-400' },
                            ].map((item) => (
                                <div key={item.name} className="space-y-1 text-xs">
                                    <div className="flex justify-between text-[11px] font-mono">
                                        <span className="text-dev-heading">{item.name}</span>
                                        <span className="text-dev-textSubtle">{item.count} events</span>
                                    </div>
                                    <div className="h-2 w-full bg-dev-subtle rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${item.color} rounded-full`}
                                            style={{ width: item.percentage }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
