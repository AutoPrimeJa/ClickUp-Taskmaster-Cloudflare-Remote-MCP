import { z } from "zod";
import { CLICKUP_CONFIG } from "../config";

// Schema definitions for task tools
export const listTasksSchema = z.object({
  list_id: z.string().optional().describe(`List ID (defaults to ${CLICKUP_CONFIG.LIST_ID})`),
  archived: z.boolean().optional().default(false),
  page: z.number().optional().default(0),
  limit: z.number().optional().default(20).describe("Max tasks to return (default 20, max 100)"),
  order_by: z.enum(["created", "updated", "id", "due_date"]).optional(),
  reverse: z.boolean().optional(),
  subtasks: z.boolean().optional().default(false),
  statuses: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
});

export const getTaskSchema = z.object({
  task_id: z.string().describe("The ID of the task to retrieve"),
  custom_task_ids: z.string().optional(),
  team_id: z.string().optional().default(CLICKUP_CONFIG.TEAM_ID),
});

export const createTaskSchema = z.object({
  list_id: z.string().optional().default(CLICKUP_CONFIG.LIST_ID),
  name: z.string().describe("Task name (required)"),
  description: z.string().optional().describe("Task description"),
  assignees: z.array(z.number()).optional().describe("User IDs to assign"),
  tags: z.array(z.string()).optional(),
  status: z.string().optional(),
  priority: z.number().optional().describe("1=Urgent, 2=High, 3=Normal, 4=Low"),
  due_date: z.number().optional().describe("Unix timestamp in milliseconds"),
  due_date_time: z.boolean().optional(),
  notify_all: z.boolean().optional().default(true),
});

export const updateTaskSchema = z.object({
  task_id: z.string().describe("The ID of the task to update"),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.number().optional(),
  assignees: z.object({
    add: z.array(z.number()).optional(),
    rem: z.array(z.number()).optional(),
  }).optional(),
  archived: z.boolean().optional(),
});

// Tool definitions
export const taskTools = [
  {
    name: "list_tasks",
    description: `Get tasks from your ClickUp list (defaults to list ${CLICKUP_CONFIG.LIST_ID}). Use this to see what tasks exist, check status, or find tasks to work on.`,
    inputSchema: listTasksSchema,
  },
  {
    name: "get_task",
    description: "Get detailed information about a specific task including custom fields, description, comments count, and full metadata.",
    inputSchema: getTaskSchema,
  },
  {
    name: "create_task",
    description: `Create a new task in your ClickUp list (defaults to list ${CLICKUP_CONFIG.LIST_ID}). Returns the created task with its ID.`,
    inputSchema: createTaskSchema,
  },
  {
    name: "update_task",
    description: "Update an existing task - change status, description, assignees, priority, or archive it.",
    inputSchema: updateTaskSchema,
  },
];

// API call implementations
export async function listTasks(args: z.infer<typeof listTasksSchema>, apiToken: string) {
  const listId = args.list_id || CLICKUP_CONFIG.LIST_ID;
  const params = new URLSearchParams();

  if (args.archived !== undefined) params.set("archived", String(args.archived));
  if (args.page !== undefined) params.set("page", String(args.page));
  if (args.order_by) params.set("order_by", args.order_by);
  if (args.reverse !== undefined) params.set("reverse", String(args.reverse));
  if (args.subtasks !== undefined) params.set("subtasks", String(args.subtasks));
  if (args.statuses) args.statuses.forEach(s => params.append("statuses[]", s));
  if (args.assignees) args.assignees.forEach(a => params.append("assignees[]", a));

  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/list/${listId}/task?${params}`,
    {
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  const limit = Math.min(args.limit || 20, 100);

  // Return trimmed summary to avoid bloated responses
  const tasks = (data.tasks || []).slice(0, limit).map((t: any) => ({
    id: t.id,
    name: t.name,
    status: t.status?.status,
    priority: t.priority?.priority,
    due_date: t.due_date,
    assignees: t.assignees?.map((a: any) => a.username || a.email),
  }));

  return {
    total: data.tasks?.length || 0,
    returned: tasks.length,
    tasks,
  };
}

export async function getTask(args: z.infer<typeof getTaskSchema>, apiToken: string) {
  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/task/${args.task_id}`,
    {
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function createTask(args: z.infer<typeof createTaskSchema>, apiToken: string) {
  const listId = args.list_id || CLICKUP_CONFIG.LIST_ID;

  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/list/${listId}/task`,
    {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function updateTask(args: z.infer<typeof updateTaskSchema>, apiToken: string) {
  const { task_id, ...updateData } = args;

  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/task/${task_id}`,
    {
      method: "PUT",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
