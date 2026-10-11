import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load .env and .env.local into process.env so serverless functions can read DATABASE_URL locally
    const env = loadEnv(mode, process.cwd(), '');
    for (const [key, val] of Object.entries(env)) {
        if (!process.env[key]) {
            process.env[key] = val;
        }
    }

    return {
        plugins: [
            react(),
            {
                name: 'devflow-api-dev-server',
                configureServer(server) {
                    server.middlewares.use(async (req, res, next) => {
                        if (!req.url || !req.url.startsWith('/api')) {
                            return next();
                        }

                        try {
                            const urlObj = new URL(req.url, 'http://localhost:5173');
                            const pathname = urlObj.pathname;
                            const query: Record<string, string> = {};
                            urlObj.searchParams.forEach((v, k) => {
                                query[k] = v;
                            });

                            // Read JSON body for POST/PATCH/PUT
                            let body: any = {};
                            if (['POST', 'PATCH', 'PUT'].includes(req.method || '')) {
                                const chunks: Buffer[] = [];
                                for await (const chunk of req) {
                                    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                                }
                                const rawBody = Buffer.concat(chunks).toString('utf8');
                                if (rawBody.trim()) {
                                    try {
                                        body = JSON.parse(rawBody);
                                    } catch {
                                        body = {};
                                    }
                                }
                            }

                            // Create minimal VercelRequest / VercelResponse adapter
                            const vercelReq: any = Object.assign(req, {
                                query,
                                body,
                                cookies: {},
                            });

                            const vercelRes: any = Object.assign(res, {
                                status(code: number) {
                                    res.statusCode = code;
                                    return vercelRes;
                                },
                                json(data: any) {
                                    res.setHeader('Content-Type', 'application/json; charset=utf-8');
                                    res.end(JSON.stringify(data, null, 2));
                                    return vercelRes;
                                },
                                send(data: any) {
                                    res.end(typeof data === 'object' ? JSON.stringify(data) : data);
                                    return vercelRes;
                                },
                            });

                            // Route 1: /api/health
                            if (pathname === '/api/health') {
                                const healthHandler = (await import('./api/health')).default;
                                await healthHandler(vercelReq, vercelRes);
                                return;
                            }

                            // Route 2: /api/projects/:id
                            const projectDetailMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
                            if (projectDetailMatch) {
                                vercelReq.query.id = projectDetailMatch[1];
                                const projectDetailHandler = (await import('./api/projects/[id]')).default;
                                await projectDetailHandler(vercelReq, vercelRes);
                                return;
                            }

                            // Route 3: /api/projects
                            if (pathname === '/api/projects' || pathname === '/api/projects/') {
                                const projectsHandler = (await import('./api/projects/index')).default;
                                await projectsHandler(vercelReq, vercelRes);
                                return;
                            }

                            // Route 4: /api/tasks/:id
                            const taskDetailMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
                            if (taskDetailMatch) {
                                vercelReq.query.id = taskDetailMatch[1];
                                const taskDetailHandler = (await import('./api/tasks/[id]')).default;
                                await taskDetailHandler(vercelReq, vercelRes);
                                return;
                            }

                            // Route 5: /api/tasks
                            if (pathname === '/api/tasks' || pathname === '/api/tasks/') {
                                const tasksHandler = (await import('./api/tasks/index')).default;
                                await tasksHandler(vercelReq, vercelRes);
                                return;
                            }

                            next();
                        } catch (err: any) {
                            console.error('API middleware error:', err);
                            res.statusCode = 500;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Internal API Server Error', message: err.message }));
                        }
                    });
                },
            },
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        server: {
            port: 5173,
            host: true,
        },
    };
});
