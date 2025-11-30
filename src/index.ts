/**
 * ClickUp Taskmaster - Remote MCP Server on Cloudflare Workers
 *
 * AUTHLESS remote MCP server using Cloudflare's McpAgent pattern.
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { Env, CLICKUP_CONFIG } from "./config";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  listTasksSchema,
  getTaskSchema,
  createTaskSchema,
  updateTaskSchema,
} from "./tools/tasks";
import {
  postComment,
  getComments,
  postCommentSchema,
  getCommentsSchema,
} from "./tools/comments";
import {
  getListCustomFields,
  setCustomField,
  getListCustomFieldsSchema,
  setCustomFieldSchema,
} from "./tools/custom-fields";

/**
 * ClickUp MCP Server - Durable Object
 */
export class ClickUpMCP extends McpAgent<Env, {}, {}> {
  server = new McpServer({
    name: "clickup-taskmaster",
    version: "1.0.0",
  });

  async init() {
    const token = this.env.CLICKUP_API_TOKEN || "";

    // list_tasks
    this.server.tool(
      "list_tasks",
      `Get tasks from ClickUp list (defaults to ${CLICKUP_CONFIG.LIST_ID})`,
      {
        list_id: z.string().optional(),
        archived: z.boolean().optional(),
        page: z.number().optional(),
      },
      async (args) => {
        try {
          const result = await listTasks(listTasksSchema.parse(args), token);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
      }
    );

    // get_task
    this.server.tool(
      "get_task",
      "Get detailed information about a specific task",
      {
        task_id: z.string(),
      },
      async (args) => {
        try {
          const result = await getTask(getTaskSchema.parse(args), token);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
      }
    );

    // create_task
    this.server.tool(
      "create_task",
      `Create a new task in ClickUp (defaults to list ${CLICKUP_CONFIG.LIST_ID})`,
      {
        name: z.string(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.number().optional(),
      },
      async (args) => {
        try {
          const result = await createTask(createTaskSchema.parse(args), token);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
      }
    );

    // update_task
    this.server.tool(
      "update_task",
      "Update an existing task",
      {
        task_id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.number().optional(),
      },
      async (args) => {
        try {
          const result = await updateTask(updateTaskSchema.parse(args), token);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
      }
    );
  }
}

// Use McpAgent.mount() - this is the CORRECT way to expose the MCP server
// It handles /sse, /message, SSE protocol, and everything automatically
export default ClickUpMCP.mount("/sse");
