/**
 * ClickUp Taskmaster - Remote MCP Server on Cloudflare Workers
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

// MCP Server class - must be named MyMCP to match binding
export class MyMCP extends McpAgent<Env, {}, {}> {
  server = new McpServer({
    name: "clickup-taskmaster",
    version: "1.0.0",
  });

  async init() {
    const token = this.env.CLICKUP_API_TOKEN || "";

    // list_tasks
    this.server.tool(
      "list_tasks",
      `List tasks from ClickUp list ${CLICKUP_CONFIG.LIST_ID}. Use statuses: ["to do"] to filter.`,
      {
        list_id: z.string().optional(),
        statuses: z.array(z.string()).optional(),
        limit: z.number().optional(),
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
      "Get task details",
      { task_id: z.string() },
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
      `Create task in list ${CLICKUP_CONFIG.LIST_ID}`,
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
      "Update a task",
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

    // post_comment
    this.server.tool(
      "post_comment",
      "Add comment to task",
      { task_id: z.string(), comment_text: z.string() },
      async (args) => {
        try {
          const result = await postComment(postCommentSchema.parse(args), token);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
      }
    );

    // get_comments
    this.server.tool(
      "get_comments",
      "Get task comments",
      { task_id: z.string() },
      async (args) => {
        try {
          const result = await getComments(getCommentsSchema.parse(args), token);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
      }
    );

    // get_list_custom_fields
    this.server.tool(
      "get_list_custom_fields",
      "Discover custom fields on list",
      { list_id: z.string().optional() },
      async (args) => {
        try {
          const result = await getListCustomFields(getListCustomFieldsSchema.parse(args), token);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
      }
    );

    // set_custom_field
    this.server.tool(
      "set_custom_field",
      "Set custom field value on task",
      { task_id: z.string(), field_id: z.string(), value: z.any() },
      async (args) => {
        try {
          const result = await setCustomField(setCustomFieldSchema.parse(args), token);
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
      }
    );
  }
}

// Export handler with error handling
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/sse" || url.pathname === "/sse/message") {
        return await MyMCP.serveSSE("/sse").fetch(request, env, ctx);
      }

      if (url.pathname === "/mcp") {
        return await MyMCP.serve("/mcp").fetch(request, env, ctx);
      }
    } catch (error) {
      return new Response(JSON.stringify({
        error: "MCP Error",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/" || url.pathname === "") {
      return new Response(JSON.stringify({
        status: "online",
        name: "ClickUp Taskmaster MCP",
        endpoints: { sse: "/sse", mcp: "/mcp" },
        has_token: !!env.CLICKUP_API_TOKEN,
      }, null, 2), { headers: { "Content-Type": "application/json" } });
    }

    return new Response("Not found", { status: 404 });
  },
};
