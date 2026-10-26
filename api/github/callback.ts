import type { VercelRequest, VercelResponse } from '../_utils/response.js';
import { handleCors, methodNotAllowedResponse } from '../_utils/response.js';
import {
    verifyOAuthState,
    exchangeOAuthCode,
    fetchGitHubUserProfile,
    fetchUserInstallations,
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

    console.log(
        '[GitHub/Callback] Received callback. Code present: %s, Installation present: %s, Error: %s',
        Boolean(codeParam),
        Boolean(installationIdParam),
        errorParam || 'none'
    );

    // 1. Handle GitHub authorization denial or error
    if (errorParam) {
        const errorMsg = errorParam === 'access_denied'
            ? 'GitHub authorization was declined or cancelled.'
            : (errorDesc || `GitHub authorization failed (${errorParam})`);
        console.warn('[GitHub/Callback] Authorization declined or error received: %s', errorMsg);
        res.statusCode = 302;
        res.setHeader('Location', `${returnTo}?github=error&message=${encodeURIComponent(errorMsg)}`);
        res.end();
        return;
    }

    // 2. Reject missing or invalid/expired CSRF state
    if (!stateParam || !statePayload) {
        console.warn('[GitHub/Callback] Missing or invalid state parameter.');
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
        console.warn('[GitHub/Callback] Neither code nor installation ID was provided.');
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
        let finalInstallationId: string | null = installationIdParam;

        if (codeParam) {
            console.log('[GitHub/Callback] Exchanging OAuth authorization code...');
            const tokenResult = await exchangeOAuthCode(codeParam);
            if (tokenResult) {
                console.log('[GitHub/Callback] Code exchange succeeded.');
                accessToken = tokenResult.accessToken;
                grantedScope = tokenResult.scope;

                const profile = await fetchGitHubUserProfile(accessToken);
                if (profile) {
                    githubUserId = String(profile.id);
                    githubUsername = profile.login;
                    githubAvatarUrl = profile.avatarUrl;
                    accountType = profile.type || 'User';
                    console.log('[GitHub/Callback] Retrieved profile for GitHub user: @%s (ID: %s)', githubUsername, githubUserId);
                }

                // If installation_id was not in query params (e.g. from user authorization flow),
                // query GitHub API to discover the app's installation ID
                if (!finalInstallationId) {
                    console.log('[GitHub/Callback] Querying user installations to discover GitHub App installation ID...');
                    const installations = await fetchUserInstallations(accessToken);
                    if (installations && installations.length > 0) {
                        finalInstallationId = String(installations[0].id);
                        console.log('[GitHub/Callback] Discovered GitHub App installation ID %s for user @%s', finalInstallationId, githubUsername);
                    } else {
                        console.log('[GitHub/Callback] No GitHub App installation found for user @%s (connected via OAuth user token)', githubUsername);
                    }
                }
            } else if (!installationIdParam) {
                console.warn('[GitHub/Callback] OAuth code exchange failed. Check GITHUB_CLIENT_SECRET configuration.');
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

        if (finalInstallationId) {
            metadata.installationId = finalInstallationId;
        }

        // 4. Save connection in Neon DB, strictly bound to the authenticated user ID
        await upsertGitHubIntegration({
            userId,
            githubUserId,
            githubUsername,
            githubAvatarUrl,
            installationId: finalInstallationId,
            accountType,
            status: 'connected',
            scope: grantedScope,
            metadata,
            accessToken,
        });

        console.log(
            '[GitHub/Callback] Successfully saved GitHub integration for user %s (GitHub: @%s, Installation: %s)',
            userId,
            githubUsername || 'none',
            finalInstallationId || 'none'
        );

        // 5. Successful redirect
        const usernameQuery = githubUsername ? `&username=${encodeURIComponent(githubUsername)}` : '';
        res.statusCode = 302;
        res.setHeader('Location', `${returnTo}?github=connected${usernameQuery}`);
        res.end();
    } catch (err: any) {
        const safeError = err.message || 'Database error while saving GitHub connection';
        console.error('[GitHub/Callback] Error during callback processing: %s', safeError);
        res.statusCode = 302;
        res.setHeader('Location', `${returnTo}?github=error&message=${encodeURIComponent(safeError)}`);
        res.end();
    }
}

