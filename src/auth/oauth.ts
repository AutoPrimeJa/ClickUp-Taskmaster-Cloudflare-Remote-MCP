/**
 * ClickUp OAuth 2.0 Handler
 *
 * Implements the OAuth 2.0 authorization code flow for ClickUp:
 * 1. /oauth/authorize - Redirects user to ClickUp consent page
 * 2. /oauth/callback - Handles callback, exchanges code for token
 * 3. Stores tokens in KV for retrieval by MCP tools
 */

import { Env } from "../config";

// ClickUp OAuth endpoints
const CLICKUP_AUTH_URL = "https://app.clickup.com/api";
const CLICKUP_TOKEN_URL = "https://api.clickup.com/api/v2/oauth/token";

// Token storage key prefix
const TOKEN_KEY_PREFIX = "oauth_token:";
const STATE_KEY_PREFIX = "oauth_state:";

// Token expiry (ClickUp tokens don't expire, but we'll set a long TTL)
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 year
const STATE_TTL_SECONDS = 60 * 10; // 10 minutes for state validation

export interface OAuthToken {
  access_token: string;
  token_type: string;
  created_at: number;
}

export interface OAuthState {
  redirect_after?: string;
  created_at: number;
}

/**
 * Generate a cryptographically secure random state parameter
 */
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Encrypt token data for secure storage
 */
async function encryptToken(
  token: OAuthToken,
  encryptionKey: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(token));

  // Derive key from encryption key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(encryptionKey.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    data
  );

  // Combine IV + encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt token data from storage
 */
async function decryptToken(
  encryptedData: string,
  encryptionKey: string
): Promise<OAuthToken> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Decode base64
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  // Derive key from encryption key
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(encryptionKey.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    encrypted
  );

  return JSON.parse(decoder.decode(decrypted));
}

/**
 * Handle /oauth/authorize - Start OAuth flow
 */
export async function handleAuthorize(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);

  // Validate required environment variables
  if (!env.CLICKUP_CLIENT_ID) {
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "CLICKUP_CLIENT_ID is not configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Generate state parameter for CSRF protection
  const state = generateState();

  // Store state in KV for validation on callback
  const stateData: OAuthState = {
    redirect_after: url.searchParams.get("redirect_after") || undefined,
    created_at: Date.now(),
  };

  await env.OAUTH_KV.put(`${STATE_KEY_PREFIX}${state}`, JSON.stringify(stateData), {
    expirationTtl: STATE_TTL_SECONDS,
  });

  // Build redirect URI (use the callback endpoint on this worker)
  const redirectUri = `${url.origin}/oauth/callback`;

  // Build ClickUp authorization URL
  const authUrl = new URL(CLICKUP_AUTH_URL);
  authUrl.searchParams.set("client_id", env.CLICKUP_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  // Redirect to ClickUp
  return Response.redirect(authUrl.toString(), 302);
}

/**
 * Handle /oauth/callback - Exchange code for token
 */
export async function handleCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);

  // Get authorization code and state from query params
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    return new Response(
      JSON.stringify({
        error: "OAuth Error",
        message: error,
        description: url.searchParams.get("error_description"),
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return new Response(
      JSON.stringify({
        error: "Invalid Request",
        message: "Missing code or state parameter",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate state parameter (CSRF protection)
  const storedStateJson = await env.OAUTH_KV.get(`${STATE_KEY_PREFIX}${state}`);
  if (!storedStateJson) {
    return new Response(
      JSON.stringify({
        error: "Invalid State",
        message: "State parameter is invalid or expired. Please try again.",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Delete state after validation (one-time use)
  await env.OAUTH_KV.delete(`${STATE_KEY_PREFIX}${state}`);
  const storedState: OAuthState = JSON.parse(storedStateJson);

  // Validate required environment variables
  if (!env.CLICKUP_CLIENT_ID || !env.CLICKUP_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({
        error: "Configuration Error",
        message: "OAuth credentials are not configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Exchange authorization code for access token
  const tokenResponse = await fetch(CLICKUP_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: env.CLICKUP_CLIENT_ID,
      client_secret: env.CLICKUP_CLIENT_SECRET,
      code: code,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    return new Response(
      JSON.stringify({
        error: "Token Exchange Failed",
        message: "Failed to exchange authorization code for token",
        details: errorText,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const tokenData = await tokenResponse.json() as { access_token: string };

  // Get user info to use as token key
  const userResponse = await fetch("https://api.clickup.com/api/v2/user", {
    headers: {
      Authorization: tokenData.access_token,
    },
  });

  let userId = "default";
  if (userResponse.ok) {
    const userData = await userResponse.json() as { user: { id: number } };
    userId = String(userData.user?.id || "default");
  }

  // Create token object
  const token: OAuthToken = {
    access_token: tokenData.access_token,
    token_type: "Bearer",
    created_at: Date.now(),
  };

  // Encrypt and store token
  const encryptionKey = env.COOKIE_ENCRYPTION_KEY || "default-key-change-me";
  const encryptedToken = await encryptToken(token, encryptionKey);

  await env.OAUTH_KV.put(`${TOKEN_KEY_PREFIX}${userId}`, encryptedToken, {
    expirationTtl: TOKEN_TTL_SECONDS,
  });

  // Also store as "default" token for the MCP server to use
  await env.OAUTH_KV.put(`${TOKEN_KEY_PREFIX}default`, encryptedToken, {
    expirationTtl: TOKEN_TTL_SECONDS,
  });

  // Build success response
  const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>ClickUp Connected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card {
      background: white;
      padding: 2rem 3rem;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 400px;
    }
    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 { color: #333; margin-bottom: 0.5rem; }
    p { color: #666; line-height: 1.6; }
    .user-id {
      background: #f0f0f0;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      font-family: monospace;
      margin: 1rem 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="success-icon">✅</div>
    <h1>Connected to ClickUp!</h1>
    <p>Your ClickUp account has been successfully connected.</p>
    <div class="user-id">User ID: ${userId}</div>
    <p>You can now close this window and use the MCP server with Claude.</p>
  </div>
</body>
</html>
  `;

  return new Response(successHtml, {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * Get stored OAuth token for a user
 */
export async function getStoredToken(
  env: Env,
  userId: string = "default"
): Promise<string | null> {
  const encryptedToken = await env.OAUTH_KV.get(`${TOKEN_KEY_PREFIX}${userId}`);

  if (!encryptedToken) {
    return null;
  }

  try {
    const encryptionKey = env.COOKIE_ENCRYPTION_KEY || "default-key-change-me";
    const token = await decryptToken(encryptedToken, encryptionKey);
    return token.access_token;
  } catch (error) {
    console.error("Failed to decrypt token:", error);
    return null;
  }
}

/**
 * Check if a user has a valid OAuth token
 */
export async function hasValidToken(
  env: Env,
  userId: string = "default"
): Promise<boolean> {
  const token = await getStoredToken(env, userId);
  return token !== null;
}

/**
 * Revoke/delete a stored token
 */
export async function revokeToken(
  env: Env,
  userId: string = "default"
): Promise<void> {
  await env.OAUTH_KV.delete(`${TOKEN_KEY_PREFIX}${userId}`);
}

/**
 * Handle /oauth/status - Check authentication status
 */
export async function handleStatus(
  request: Request,
  env: Env
): Promise<Response> {
  const hasToken = await hasValidToken(env);

  return new Response(
    JSON.stringify({
      authenticated: hasToken,
      oauth_configured: !!(env.CLICKUP_CLIENT_ID && env.CLICKUP_CLIENT_SECRET),
      fallback_token: !!env.CLICKUP_API_TOKEN,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Handle /oauth/logout - Revoke token
 */
export async function handleLogout(
  request: Request,
  env: Env
): Promise<Response> {
  await revokeToken(env);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Token revoked successfully",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}
