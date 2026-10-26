import type { VercelRequest, VercelResponse } from '../_utils/response.js';
import { handleCors, methodNotAllowedResponse, jsonResponse, errorResponse } from '../_utils/response.js';
import { requireAuth } from '../_utils/auth.js';
import { disconnectGitHubIntegration } from '../_utils/github.js';

export default async function disconnectHandler(req: VercelRequest, res: VercelResponse): Promise<void> {
    if (handleCors(req, res, ['POST', 'DELETE', 'OPTIONS'])) {
        return;
    }

    if (req.method !== 'POST' && req.method !== 'DELETE') {
        methodNotAllowedResponse(res, ['POST', 'DELETE']);
        return;
    }

    const user = requireAuth(req, res);
    if (!user) {
        return; // requireAuth already responded with 401
    }

    try {
        await disconnectGitHubIntegration(user.userId);

        jsonResponse(res, 200, {
            success: true,
            message: 'GitHub connection disconnected successfully.',
        });
    } catch (err: any) {
        errorResponse(
            res,
            500,
            err.message || 'Failed to disconnect GitHub integration',
            'DISCONNECT_ERROR'
        );
    }
}
