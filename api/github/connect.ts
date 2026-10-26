import type { VercelRequest, VercelResponse } from '../_utils/response.js';
import { handleCors, methodNotAllowedResponse, errorResponse, jsonResponse } from '../_utils/response.js';
import { extractUserFromRequest } from '../_utils/auth.js';
import { getGitHubConfig, isGitHubConfigured, createOAuthState } from '../_utils/github.js';

export default async function connectHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (handleCors(req, res, ['GET', 'POST', 'OPTIONS'])) {
        return;
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        methodNotAllowedResponse(res, ['GET', 'POST']);
        return;
    }

    // Support authentication via Bearer header or query token for browser redirect
    let user = extractUserFromRequest(req);
    if (!user && req.query.token && typeof req.query.token === 'string') {
        // Create mock header to reuse auth validation
        const authReq: any = { headers: { authorization: `Bearer ${req.query.token}` } };
        user = extractUserFromRequest(authReq);
    }

    if (!user) {
        errorResponse(
            res,
            401,
            'Authentication required. Please sign in to connect a GitHub account.',
            'UNAUTHORIZED'
        );
        return;
    }

    if (!isGitHubConfigured()) {
        errorResponse(
            res,
            503,
            'GitHub integration is not yet configured on this server. Please configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET or GITHUB_APP_SLUG in your server environment variables.',
            'GITHUB_NOT_CONFIGURED'
        );
        return;
    }

    const config = getGitHubConfig();
    const returnTo = typeof req.query.returnTo === 'string' && req.query.returnTo.startsWith('/')
        ? req.query.returnTo
        : '/settings';

    // Generate secure CSRF state linked to this user's ID
    const state = createOAuthState(user.userId, returnTo);

    let authUrl: string;
    const redirectParam = config.redirectUri ? `&redirect_uri=${encodeURIComponent(config.redirectUri)}` : '';

    if (req.query.flow === 'install' && config.appSlug) {
        // Explicit GitHub App Installation Flow (for installing on new orgs/repos)
        authUrl = `https://github.com/apps/${encodeURIComponent(config.appSlug)}/installations/new?state=${encodeURIComponent(state)}`;
        console.log('[GitHub/Connect] Initiated installation flow for user: %s', user.userId);
    } else if (config.clientId) {
        // Primary flow for connecting an account/app: User authorization flow
        // Works whether app is already installed or new, and guarantees redirect to callback URL
        authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(config.clientId)}&state=${encodeURIComponent(state)}&scope=read:user${redirectParam}`;
        console.log('[GitHub/Connect] Initiated OAuth user authorization flow for user: %s', user.userId);
    } else if (config.appSlug) {
        // Fallback to app installation if only appSlug is provided
        authUrl = `https://github.com/apps/${encodeURIComponent(config.appSlug)}/installations/new?state=${encodeURIComponent(state)}`;
        console.log('[GitHub/Connect] Fallback to app installation flow for user: %s', user.userId);
    } else {
        errorResponse(res, 503, 'GitHub integration is not properly configured.', 'GITHUB_NOT_CONFIGURED');
        return;
    }

    // Set secure HttpOnly cookie for CSRF defense-in-depth
    const isProd = process.env.NODE_ENV === 'production';
    const cookieHeader = `devflow_gh_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${isProd ? '; Secure' : ''}`;
    res.setHeader('Set-Cookie', cookieHeader);

    // If client requested JSON or sent POST, return JSON containing redirect URL
    const acceptHeader = req.headers.accept || '';
    if (req.method === 'POST' || acceptHeader.includes('application/json') || req.query.format === 'json') {
        jsonResponse(res, 200, {
            success: true,
            url: authUrl,
            state,
        });
        return;
    }

    // Otherwise, issue HTTP 302 redirect for browser navigations
    res.statusCode = 302;
    res.setHeader('Location', authUrl);
    res.end();
}
