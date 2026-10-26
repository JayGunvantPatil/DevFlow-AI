import crypto from 'node:crypto';
import { getJwtSecret } from './auth.js';
import { query } from './db.js';

export interface GitHubConfig {
    appSlug?: string;
    clientId?: string;
    clientSecret?: string;
    appId?: string;
    redirectUri?: string;
}

export interface OAuthStatePayload {
    userId: string;
    nonce: string;
    exp: number;
    returnTo: string;
}

export interface GitHubIntegrationRecord {
    id: string;
    user_id: string;
    github_user_id: string | null;
    github_username: string | null;
    github_avatar_url: string | null;
    installation_id: string | null;
    account_type: string;
    status: 'connected' | 'disconnected' | 'suspended';
    scope: string | null;
    metadata: Record<string, any>;
    created_at: string;
    updated_at: string;
}

/**
 * Reads server-side GitHub App & OAuth environment variables.
 * Credentials are NEVER exposed to the frontend.
 */
export function getGitHubConfig(): GitHubConfig {
    return {
        appSlug: process.env.GITHUB_APP_SLUG?.trim() || undefined,
        clientId: process.env.GITHUB_CLIENT_ID?.trim() || undefined,
        clientSecret: process.env.GITHUB_CLIENT_SECRET?.trim() || undefined,
        appId: process.env.GITHUB_APP_ID?.trim() || undefined,
        redirectUri: process.env.GITHUB_REDIRECT_URI?.trim() || undefined,
    };
}

/**
 * Checks whether the minimum required GitHub integration credentials exist.
 */
export function isGitHubConfigured(): boolean {
    const config = getGitHubConfig();
    return Boolean(config.appSlug || (config.clientId && config.clientSecret));
}

/**
 * Generates an HMAC-SHA256 signed OAuth state parameter to prevent CSRF attacks.
 * Valid for 10 minutes.
 */
export function createOAuthState(userId: string, returnTo: string = '/settings'): string {
    const secret = getJwtSecret();
    const payload: OAuthStatePayload = {
        userId,
        nonce: crypto.randomBytes(16).toString('hex'),
        exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        returnTo: returnTo.startsWith('/') ? returnTo : '/settings',
    };

    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8')
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const signature = crypto
        .createHmac('sha256', secret)
        .update(encodedPayload)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${encodedPayload}.${signature}`;
}

/**
 * Verifies and decodes an HMAC-signed OAuth state parameter.
 * Uses timingSafeEqual to prevent timing attacks.
 */
export function verifyOAuthState(state: string): OAuthStatePayload | null {
    if (!state || typeof state !== 'string') {
        return null;
    }

    const parts = state.trim().split('.');
    if (parts.length !== 2) {
        return null;
    }

    const [encodedPayload, signature] = parts;
    const secret = getJwtSecret();

    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(encodedPayload)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== actualBuf.length) {
        return null;
    }

    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        return null;
    }

    try {
        let base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const json = Buffer.from(base64, 'base64').toString('utf8');
        const payload = JSON.parse(json) as OAuthStatePayload;

        const now = Math.floor(Date.now() / 1000);
        if (!payload.userId || typeof payload.exp !== 'number' || payload.exp < now) {
            return null; // Expired or invalid
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Derives a 32-byte encryption key from the server-side JWT secret.
 */
function getEncryptionKey(): Buffer {
    const secret = getJwtSecret();
    return crypto.scryptSync(secret, 'devflow_github_encryption_salt_2026', 32);
}

/**
 * Encrypts a sensitive credential (e.g. access token) using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (all base64)
 */
export function encryptToken(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted token.
 */
export function decryptToken(encryptedString: string): string | null {
    try {
        const parts = encryptedString.split(':');
        if (parts.length !== 3) {
            return null;
        }

        const [ivB64, authTagB64, cipherB64] = parts;
        const key = getEncryptionKey();
        const iv = Buffer.from(ivB64, 'base64');
        const authTag = Buffer.from(authTagB64, 'base64');

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(cipherB64, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch {
        return null;
    }
}

/**
 * Retrieves the current GitHub integration record for a specific DevFlow user.
 * Never leaks the access token.
 */
export async function getUserGitHubIntegration(userId: string): Promise<GitHubIntegrationRecord | null> {
    const rows = await query<GitHubIntegrationRecord>(
        `SELECT id, user_id, github_user_id, github_username, github_avatar_url,
                installation_id, account_type, status, scope, metadata, created_at, updated_at
         FROM github_integrations
         WHERE user_id = $1 AND status = 'connected'
         LIMIT 1`,
        [userId]
    );

    return rows.length > 0 ? rows[0] : null;
}

/**
 * Inserts or updates a user's GitHub integration record in Neon PostgreSQL.
 */
export async function upsertGitHubIntegration(data: {
    userId: string;
    githubUserId?: string | null;
    githubUsername?: string | null;
    githubAvatarUrl?: string | null;
    installationId?: string | null;
    accountType?: string;
    status?: 'connected' | 'disconnected' | 'suspended';
    scope?: string | null;
    metadata?: Record<string, any>;
    accessToken?: string | null;
    tokenExpiresAt?: Date | null;
}): Promise<GitHubIntegrationRecord> {
    const encryptedToken = data.accessToken ? encryptToken(data.accessToken) : null;
    const metadataJson = JSON.stringify(data.metadata || {});

    const rows = await query<GitHubIntegrationRecord>(
        `INSERT INTO github_integrations (
            user_id, github_user_id, github_username, github_avatar_url,
            installation_id, account_type, status, scope, metadata,
            encrypted_access_token, token_expires_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            github_user_id = COALESCE(EXCLUDED.github_user_id, github_integrations.github_user_id),
            github_username = COALESCE(EXCLUDED.github_username, github_integrations.github_username),
            github_avatar_url = COALESCE(EXCLUDED.github_avatar_url, github_integrations.github_avatar_url),
            installation_id = COALESCE(EXCLUDED.installation_id, github_integrations.installation_id),
            account_type = COALESCE(EXCLUDED.account_type, github_integrations.account_type),
            status = EXCLUDED.status,
            scope = COALESCE(EXCLUDED.scope, github_integrations.scope),
            metadata = github_integrations.metadata || EXCLUDED.metadata,
            encrypted_access_token = COALESCE(EXCLUDED.encrypted_access_token, github_integrations.encrypted_access_token),
            token_expires_at = COALESCE(EXCLUDED.token_expires_at, github_integrations.token_expires_at),
            updated_at = NOW()
        RETURNING id, user_id, github_user_id, github_username, github_avatar_url,
                  installation_id, account_type, status, scope, metadata, created_at, updated_at`,
        [
            data.userId,
            data.githubUserId || null,
            data.githubUsername || null,
            data.githubAvatarUrl || null,
            data.installationId || null,
            data.accountType || 'User',
            data.status || 'connected',
            data.scope || 'read:user',
            metadataJson,
            encryptedToken,
            data.tokenExpiresAt ? data.tokenExpiresAt.toISOString() : null,
        ]
    );

    return rows[0];
}

/**
 * Disconnects the user's GitHub integration.
 * Sets status to 'disconnected' and removes any stored tokens.
 */
export async function disconnectGitHubIntegration(userId: string): Promise<boolean> {
    await query(
        `UPDATE github_integrations
         SET status = 'disconnected',
             encrypted_access_token = NULL,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
    );
    return true;
}

/**
 * Exchanges an OAuth temporary code for a GitHub access token.
 */
export async function exchangeOAuthCode(
    code: string,
    redirectUri?: string
): Promise<{ accessToken: string; scope: string; tokenType: string } | null> {
    const { clientId, clientSecret } = getGitHubConfig();
    if (!clientId || !clientSecret) {
        return null;
    }

    const config = getGitHubConfig();
    const effectiveRedirectUri = redirectUri || config.redirectUri;
    const params: Record<string, string> = {
        client_id: clientId,
        client_secret: clientSecret,
        code,
    };
    if (effectiveRedirectUri) {
        params.redirect_uri = effectiveRedirectUri;
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'DevFlow-AI',
        },
        body: JSON.stringify(params),
    });

    if (!response.ok) {
        console.warn('[GitHub/OAuth] Access token endpoint returned HTTP %d', response.status);
        return null;
    }

    const data = (await response.json()) as any;
    if (data.error || !data.access_token) {
        console.warn('[GitHub/OAuth] Code exchange rejected by GitHub: %s (%s)', data.error, data.error_description || 'no details');
        return null;
    }

    return {
        accessToken: data.access_token,
        scope: data.scope || 'read:user',
        tokenType: data.token_type || 'bearer',
    };
}

/**
 * Fetches the authenticated GitHub user profile using a user token.
 */
export async function fetchGitHubUserProfile(accessToken: string): Promise<{
    id: number;
    login: string;
    avatarUrl: string;
    type: string;
    name: string | null;
    email: string | null;
} | null> {
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'DevFlow-AI',
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = (await response.json()) as any;
        return {
            id: data.id,
            login: data.login,
            avatarUrl: data.avatar_url,
            type: data.type || 'User',
            name: data.name || null,
            email: data.email || null,
        };
    } catch {
        return null;
    }
}

/**
 * Fetches app installations accessible to the authenticated user.
 */
export async function fetchUserInstallations(
    accessToken: string
): Promise<Array<{ id: number; accountLogin: string; targetType: string; appId?: string; appSlug?: string }> | null> {
    try {
        const response = await fetch('https://api.github.com/user/installations', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
                'User-Agent': 'DevFlow-AI',
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = (await response.json()) as any;
        if (!data || !Array.isArray(data.installations)) {
            return null;
        }

        const config = getGitHubConfig();
        const installations = data.installations.map((inst: any) => ({
            id: inst.id,
            accountLogin: inst.account?.login || '',
            targetType: inst.target_type || inst.account?.type || 'User',
            appId: inst.app_id ? String(inst.app_id) : undefined,
            appSlug: inst.app_slug || undefined,
        }));

        // Prioritize installations belonging to this specific GitHub App
        if (config.appId || config.appSlug) {
            const matched = installations.filter((inst: any) => {
                if (config.appId && inst.appId && inst.appId === config.appId) {
                    return true;
                }
                if (config.appSlug && inst.appSlug && inst.appSlug.toLowerCase() === config.appSlug.toLowerCase()) {
                    return true;
                }
                return false;
            });
            if (matched.length > 0) {
                return matched;
            }
        }

        return installations;
    } catch {
        return null;
    }
}

