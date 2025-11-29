# ClickUp Taskmaster - Cloudflare Remote MCP

A remote MCP (Model Context Protocol) server for ClickUp task management, deployed on Cloudflare Workers.

## Features

- **Remote MCP Server**: Accessible from Claude.ai, Claude Desktop, Claude iOS/Android
- **Full Task Management**: List, create, update, get tasks
- **Custom Field Support**: Discover and set custom fields (Context, Link, Agent Driver, Effort, AI Priority Score)
- **Comments**: Add and read task comments
- **Document Support**: Create and manage ClickUp Docs
- **OAuth 2.1**: Secure authentication for Claude integrations

## Default Configuration

- **List ID**: 176135389
- **Team ID**: 8472392

All operations default to your specific ClickUp list.

## Available Tools

| Tool | Description |
|------|-------------|
| `list_tasks` | Get tasks from the list |
| `get_task` | Get detailed task info |
| `create_task` | Create a new task |
| `update_task` | Update task status/details |
| `get_list_custom_fields` | Discover custom field definitions |
| `set_custom_field` | Set custom field values |
| `post_comment` | Add comment to task |
| `get_comments` | Get task comments |
| `create_doc` | Create ClickUp Doc |
| `get_doc` | Get ClickUp Doc |
| `update_page` | Update Doc page |

## Deployment

### Prerequisites

1. Cloudflare account
2. Wrangler CLI installed (`npm install -g wrangler`)
3. ClickUp API token or OAuth app credentials

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create KV namespace:
   ```bash
   wrangler kv namespace create "OAUTH_KV"
   ```

4. Update `wrangler.toml` with the KV namespace ID

5. Set secrets:
   ```bash
   wrangler secret put CLICKUP_API_TOKEN
   # Or for OAuth:
   wrangler secret put CLICKUP_CLIENT_ID
   wrangler secret put CLICKUP_CLIENT_SECRET
   wrangler secret put COOKIE_ENCRYPTION_KEY
   ```

6. Deploy:
   ```bash
   npm run deploy
   ```

### Connect to Claude

After deployment, your server URL will be:
`https://clickup-taskmaster-mcp.<your-account>.workers.dev/sse`

**Claude.ai / Claude Mobile:**
1. Go to Settings > Integrations
2. Click "Add Custom"
3. Enter your server URL
4. Complete OAuth flow

**Claude Desktop:**
1. Go to Settings > Connectors
2. Add your server URL

## Development

```bash
# Start local dev server
npm run dev

# Run tests
npm test

# Deploy
npm run deploy
```

## Project Structure

```
src/
  tools/
    tasks.ts        # Task operations
    comments.ts     # Comment operations
    custom-fields.ts # Custom field discovery & setting
    docs.ts         # Document operations
  auth/             # OAuth handlers
  index.ts          # Main MCP server
  config.ts         # ClickUp configuration

.claude/
  commands/         # Slash commands (/tasks, /task-create, etc.)
  agents/           # TaskMaster agent
  skills/           # Auto-invoked task management skill
```

## License

MIT
