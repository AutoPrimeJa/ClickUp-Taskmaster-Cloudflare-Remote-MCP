---
description: Create a new task in your ClickUp list
allowed-tools: mcp__clickup-taskmaster__create_task
argument-hint: "task name [description]"
---

Create a new task using the `create_task` tool from clickup-taskmaster MCP.

User input: $ARGUMENTS

Parse the input to extract:
1. Task name (required) - the first part before any obvious description
2. Description (optional) - additional details
3. Priority (optional) - if user mentions "urgent", "high priority", etc.
4. Due date (optional) - if user mentions a date

Then call create_task with the extracted information.

After creation, confirm with the task ID and a summary of what was created.
