import type { VercelRequest, VercelResponse } from '../_utils/response.js';
import { handleCors, methodNotAllowedResponse } from '../_utils/response.js';
import {
    verifyOAuthState,
    exchangeOAuthCode,
    fetchGitHubUserProfile,
    upsertGitHubIntegration,
} from '../_utils/github.js';

export default async function callbackHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (handleCors(req, res, ['GET', 'OPTIONS'])) {
        return;
    }

    if (req.method !== 'GET') {
        methodNotAllowedResponse(res, ['GET']);
        return;
    }

    const query = req.query || {};
    const errorParam = typeof query.error === 'string' ? query.error : null;
    const errorDesc = typeof query.error_description === 'string' ? query.error_description : null;
    const stateParam = typeof query.state === 'string' ? query.state : null;
    const codeParam = typeof query.code === 'string' ? query.code : null;
    const installationIdParam = typeof query.installation_id === 'string' ? query.installation_id : null;
    const setupAction = typeof query.setup_action === 'string' ? query.setup_action : null;

    let returnTo = '/settings';

    // Verify state first if provided to obtain returnTo target
    const statePayload = stateParam ? verifyOAuthState(stateParam) : null;
    if (statePayload) {
        returnTo = statePayload.returnTo || '/settings';
    }

    const clearCookieHeader = 'devflow_gh_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
    res.setHeader('Set-Cookie', clearCookieHeader);

    // 1. Handle GitHub authorization denial or error
    if (errorParam) {
        const errorMsg = errorParam === 'access_denied'
            ? 'GitHub authorization was declined or cancelled.'
            : (errorDesc || `GitHub authorization failed (${errorParam})`);
        res.statusCode = 302;
        res.setHeader('Location', `${returnTo}?github=error&message=${encodeURIComponent(errorMsg)}`);
        res.end();
        return;
    }

    // 2. Reject missing or invalid/expired CSRF state
    if (!stateParam || !statePayload) {
        res.statusCode = 302;
        res.setHeader(
            'Location',
            `${returnTo}?github=error&message=${encodeURIComponent('Invalid or expired authorization session. Please try connecting again.')}`
        );
        res.end();
        return;
    }

    const userId = statePayload.userId;

    // 3. Process authorization (OAuth code and/or App installation ID)
    if (!codeParam && !installationIdParam) {
        res.statusCode = 302;
        res.setHeader(
            'Location',
            `${returnTo}?github=error&message=${encodeURIComponent('No authorization code or installation ID received from GitHub.')}`
        );
        res.end();
        return;
    }

    try {
        let githubUserId: string | null = null;
        let githubUsername: string | null = null;
        let githubAvatarUrl: string | null = null;
        let accountType = 'User';
        let grantedScope = 'read:user';
        let accessToken: string | null = null;

        if (codeParam) {
            const tokenResult = await exchangeOAuthCode(codeParam);
            if (tokenResult) {
                accessToken = tokenResult.accessToken;
                grantedScope = tokenResult.scope;

                const profile = await fetchGitHubUserProfile(accessToken);
                if (profile) {
                    githubUserId = String(profile.id);
                    githubUsername = profile.login;
                    githubAvatarUrl = profile.avatarUrl;
                    accountType = profile.type || 'User';
                }
            } else if (!installationIdParam) {
                res.statusCode = 302;
                res.setHeader(
                    'Location',
                    `${returnTo}?github=error&message=${encodeURIComponent('GitHub authorization code exchange failed. Please verify that GITHUB_CLIENT_SECRET is correctly configured in .env.local.')}`
                );
                res.end();
                return;
            }
        }

        const metadata: Record<string, any> = {
            setupAction,
            connectedVia: codeParam ? 'oauth' : 'app_install',
        };

        if (installationIdParam) {
            metadata.installationId = installationIdParam;
        }

        // 4. Save connection in Neon DB, strictly bound to the authenticated user ID
        await upsertGitHubIntegration({
            userId,
            githubUserId,
            githubUsername,
            githubAvatarUrl,
            installationId: installationIdParam,
            accountType,
            status: 'connected',
            scope: grantedScope,
            metadata,
            accessToken,
        });

        // 5. Successful redirect
        const usernameQuery = githubUsername ? `&username=${encodeURIComponent(githubUsername)}` : '';
        res.statusCode = 302;
        res.setHeader('Location', `${returnTo}?github=connected${usernameQuery}`);
        res.end();
    } catch (err: any) {
        const safeError = err.message || 'Database error while saving GitHub connection';
        res.statusCode = 302;
        res.setHeader('Location', `${returnTo}?github=error&message=${encodeURIComponent(safeError)}`);
        res.end();
    }
}
