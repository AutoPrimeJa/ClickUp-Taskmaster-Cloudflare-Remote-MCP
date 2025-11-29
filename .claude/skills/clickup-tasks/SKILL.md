---
name: clickup-task-management
description: Auto-invoked skill for ClickUp task operations - listing tasks, creating tasks, updating status, managing custom fields
---

## When This Skill Activates

This skill is automatically invoked when the user mentions:
- Tasks, to-dos, task lists, ClickUp
- Creating, updating, or viewing tasks
- Project status, what needs to be done
- Custom fields, priorities, assignments

## Available Tools

Use the clickup-taskmaster MCP server tools:

| Tool | Purpose |
|------|---------|
| `list_tasks` | Get tasks (defaults to list 176135389) |
| `get_task` | Get specific task details |
| `create_task` | Create new task |
| `update_task` | Modify task status/details |
| `get_list_custom_fields` | Discover custom field IDs |
| `set_custom_field` | Set custom field values |
| `post_comment` | Add comment to task |
| `get_comments` | Get task comments |

## Standard Procedures

### Listing Tasks
1. Call `list_tasks` with default list
2. Group by status (to do, in progress, complete)
3. Highlight urgent/overdue items
4. Show custom fields if relevant

### Creating Tasks
1. Parse user input for: name, description, priority, due date
2. Call `create_task` with extracted data
3. Return task ID and confirmation

### Updating Tasks
1. If no task ID given, call `list_tasks` to help find it
2. Parse desired changes from natural language
3. Call `update_task` with changes
4. Confirm what was modified

### Working with Custom Fields
1. ALWAYS call `get_list_custom_fields` first
2. Cache field IDs for the session
3. Use correct field ID when calling `set_custom_field`
4. Match value type to field type (string, number, option ID)

## Important Notes

- Default list: 176135389
- Default team: 8472392
- Never suggest manual ClickUp website access when tools are available
