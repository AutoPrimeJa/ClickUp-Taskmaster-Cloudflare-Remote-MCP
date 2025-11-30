// ClickUp Configuration
// These are YOUR specific IDs - the server will ONLY work with this list

export const CLICKUP_CONFIG = {
  // Your ClickUp Team/Workspace ID
  TEAM_ID: "8472392",

  // Your specific Task List ID - ALL operations default to this list
  LIST_ID: "176135389",

  // ClickUp API Base URL
  API_URL: "https://api.clickup.com/api/v2",
} as const;

// Type for environment bindings
export interface Env {
  // Durable Object for MCP sessions (McpAgent expects MCP_OBJECT)
  MCP_OBJECT: DurableObjectNamespace;

  // KV for OAuth state
  OAUTH_KV: KVNamespace;

  // Secrets
  CLICKUP_CLIENT_ID: string;
  CLICKUP_CLIENT_SECRET: string;
  COOKIE_ENCRYPTION_KEY: string;

  // Optional: Direct API token (for simpler auth)
  CLICKUP_API_TOKEN?: string;

  // From wrangler.toml vars
  DEFAULT_TEAM_ID: string;
  DEFAULT_LIST_ID: string;
}
