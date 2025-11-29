# ClickUp Taskmaster - Project Memory

## About This Project

This is a **Remote MCP Server** for ClickUp task management, deployed on Cloudflare Workers.
It provides Claude with direct access to your ClickUp tasks via the Model Context Protocol.

**Target List:** `176135389` (Your primary task list)
**Target Team:** `8472392` (Your workspace)

---

## CRITICAL: When to Use ClickUp Tools

### ALWAYS use the `clickup-taskmaster` MCP tools when the user:

| User Says | Tool to Use |
|-----------|-------------|
| "show me my tasks", "what's on my list", "list tasks" | `list_tasks` |
| "what needs to be done", "my to-dos", "task status" | `list_tasks` |
| "tell me about task X", "task details", "get task" | `get_task` |
| "create a task", "add to my list", "new task" | `create_task` |
| "update task", "change status", "mark as done" | `update_task` |
| "add a comment", "note on task", "leave feedback" | `post_comment` |
| "show comments", "what's the discussion" | `get_comments` |
| "set custom field", "update field" | `set_custom_field` |

### DO NOT:
- Suggest the user visit ClickUp website manually
- Use web search to find task information
- Say "I don't have access to your tasks" when MCP tools are available
- Forget that the clickup-taskmaster server exists

---

## Available MCP Tools

### Task Management
| Tool | Description | Default List |
|------|-------------|--------------|
| `list_tasks` | Get all tasks from a list | 176135389 |
| `get_task` | Get detailed task info by ID | - |
| `create_task` | Create a new task | 176135389 |
| `update_task` | Update task status/details | - |

### Comments
| Tool | Description |
|------|-------------|
| `post_comment` | Add a comment to a task |
| `get_comments` | Get all comments on a task |

### Custom Fields
| Tool | Description |
|------|-------------|
| `get_list_custom_fields` | **DISCOVERY TOOL** - Get all custom field definitions (IDs, names, types, dropdown options) |
| `set_custom_field` | Set a custom field value on a task (use get_list_custom_fields first to find field IDs) |

**Known Custom Fields** (use `get_list_custom_fields` to get current IDs):
- **Context** - Background information about the task
- **Link** - Reference URLs
- **Agent Driver** - Which AI agent owns/drives this task
- **Effort** - Work estimate
- **AI Priority Score** - AI-calculated priority

### Documents
| Tool | Description |
|------|-------------|
| `create_doc` | Create a new ClickUp Doc |
| `get_doc` | Retrieve a ClickUp Doc |
| `update_page` | Update a page in a Doc |

---

## Quick Commands

Use these slash commands for fast access:
- `/tasks` - List all tasks in the default list
- `/task-create` - Create a new task
- `/task-update` - Update an existing task

---

## Tool Usage Examples

### List all tasks
```
Use list_tasks with no arguments to get tasks from the default list (176135389)
```

### Create a task
```
Use create_task with:
- name: "Task title" (required)
- description: "Task details" (optional)
- priority: 1-4 (1=Urgent, 4=Low)
- status: "to do", "in progress", "complete"
```

### Update a task
```
Use update_task with:
- task_id: "abc123" (required)
- status: "complete" (to mark done)
- priority: 1 (to make urgent)
```

### Discover custom fields
```
Use get_list_custom_fields with no arguments to discover:
- Field IDs (UUIDs needed for set_custom_field)
- Field names and types
- Dropdown options and their IDs
```

### Set a custom field
```
First: Call get_list_custom_fields to get the field ID
Then: Use set_custom_field with:
- task_id: "abc123"
- field_id: "uuid-from-discovery"
- value: depends on field type (string, number, or option ID for dropdowns)
```

---

## Project Structure

```
/src
  /tools        - Tool implementations (tasks, comments, docs)
  /auth         - OAuth handlers
  index.ts      - Main MCP server
  config.ts     - ClickUp configuration (list/team IDs)
/.claude
  /commands     - Slash commands (/tasks, /task-create, etc.)
  /agents       - TaskMaster agent definition
  /skills       - Auto-invoked task management skills
wrangler.toml   - Cloudflare deployment config
```

---

## Deployment

The server deploys to: `https://clickup-taskmaster-mcp.<your-account>.workers.dev/sse`

After deployment, add to Claude via:
1. Claude.ai: Settings > Integrations > Add Custom > Enter URL
2. Claude Desktop: Settings > Connectors > Add Custom

---

## Troubleshooting

If tools aren't working:
1. Check that the MCP server URL is correctly configured
2. Verify OAuth authentication completed
3. Ensure CLICKUP_API_TOKEN secret is set in Cloudflare
