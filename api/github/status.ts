import type { VercelRequest, VercelResponse } from '../_utils/response.js';
import { handleCors, methodNotAllowedResponse, jsonResponse } from '../_utils/response.js';
import { requireAuth } from '../_utils/auth.js';
import { isGitHubConfigured, getUserGitHubIntegration } from '../_utils/github.js';

export default async function statusHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (handleCors(req, res, ['GET', 'OPTIONS'])) {
        return;
    }

    if (req.method !== 'GET') {
        methodNotAllowedResponse(res, ['GET']);
        return;
    }

    const user = requireAuth(req, res);
    if (!user) {
        return; // requireAuth already responded with 401
    }

    const configured = isGitHubConfigured();

    try {
        const integration = await getUserGitHubIntegration(user.userId);

        if (!integration) {
            jsonResponse(res, 200, {
                configured,
                connected: false,
                integration: null,
            });
            return;
        }

        jsonResponse(res, 200, {
            configured,
            connected: true,
            integration: {
                id: integration.id,
                username: integration.github_username,
                avatarUrl: integration.github_avatar_url,
                accountType: integration.account_type,
                installationId: integration.installation_id,
                status: integration.status,
                scope: integration.scope,
                connectedAt: integration.created_at,
                updatedAt: integration.updated_at,
            },
        });
    } catch (err: any) {
        // Return safe error without leaking internal DB details
        jsonResponse(res, 200, {
            configured,
            connected: false,
            integration: null,
            error: err.message || 'Failed to fetch GitHub integration status',
        });
    }
}
