import {
    VercelRequest,
    VercelResponse,
    jsonResponse,
    methodNotAllowedResponse,
    handleCors,
} from '../_utils/response.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (handleCors(req, res, ['POST', 'OPTIONS'])) {
        return;
    }

    if (req.method !== 'POST') {
        return methodNotAllowedResponse(res, ['POST']);
    }

    return jsonResponse(res, 200, {
        success: true,
        message: 'Logged out successfully',
    });
}
