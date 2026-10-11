import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { Repositories } from './pages/Repositories';
import { Tasks } from './pages/Tasks';
import { AICodeReview } from './pages/AICodeReview';
import { RepositoryQA } from './pages/RepositoryQA';
import { TeamWorkspace } from './pages/TeamWorkspace';
import { Analytics } from './pages/Analytics';
import { SettingsPage } from './pages/Settings';

export const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppLayout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/repositories" element={<Repositories />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/ai-review" element={<AICodeReview />} />
                    <Route path="/repo-qa" element={<RepositoryQA />} />
                    <Route path="/workspace" element={<TeamWorkspace />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    {/* Fallback route */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
