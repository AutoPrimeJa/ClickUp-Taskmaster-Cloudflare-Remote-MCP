---
description: Update an existing task (status, priority, description)
allowed-tools: mcp__clickup-taskmaster__update_task, mcp__clickup-taskmaster__get_task, mcp__clickup-taskmaster__list_tasks
argument-hint: "task_id [changes]"
---

Update a task using the `update_task` tool from clickup-taskmaster MCP.

User input: $ARGUMENTS

If the user provided a task ID directly, use it.
If not, first use `list_tasks` to help them find the right task.

Common updates to parse from natural language:
- "mark as done" / "complete" -> status: "complete"
- "mark as in progress" / "start" -> status: "in progress"
- "make urgent" / "high priority" -> priority: 1
- "archive" -> archived: true

After updating, confirm what was changed.
