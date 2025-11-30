/**
 * ClickUp Taskmaster - Remote MCP Server on Cloudflare Workers
 *
 * This server provides ClickUp task management capabilities via MCP protocol.
 * It connects to a SPECIFIC ClickUp list (ID: 176135389) by default.
 *
 * This is an AUTHLESS server - it uses a pre-configured API token.
 * The token is stored securely in Cloudflare secrets.
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { Env, CLICKUP_CONFIG } from "./config";
import {
  taskTools,
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
  commentTools,
  postComment,
  getComments,
  postCommentSchema,
  getCommentsSchema,
} from "./tools/comments";
import {
  customFieldTools,
  getListCustomFields,
  setCustomField,
  getListCustomFieldsSchema,
  setCustomFieldSchema,
} from "./tools/custom-fields";
import {
  docTools,
  createDoc,
  getDoc,
  updatePage,
  createDocSchema,
  getDocSchema,
  updatePageSchema,
} from "./tools/docs";

// State for the MCP session
interface State {
  lastListId?: string;
}

/**
 * ClickUp MCP Server - Durable Object
 * Each user session gets its own instance
 */
export class ClickUpMCP extends McpAgent<Env, State, {}> {
  server = new McpServer({
    name: "clickup-taskmaster",
    version: "1.0.0",
  });

  initialState: State = {};

  async init() {
    // Get the API token from environment
    const getToken = (): string => {
      return this.env.CLICKUP_API_TOKEN || "";
    };

    // Register all task tools
    for (const tool of taskTools) {
      this.server.tool(
        tool.name,
        tool.description,
        tool.inputSchema.shape,
        async (args) => {
          const token = getToken();
          if (!token) {
            return {
              content: [{ type: "text", text: "Error: No ClickUp API token configured" }],
              isError: true,
            };
          }

          try {
            let result;
            switch (tool.name) {
              case "list_tasks":
                result = await listTasks(listTasksSchema.parse(args), token);
                break;
              case "get_task":
                result = await getTask(getTaskSchema.parse(args), token);
                break;
              case "create_task":
                result = await createTask(createTaskSchema.parse(args), token);
                break;
              case "update_task":
                result = await updateTask(updateTaskSchema.parse(args), token);
                break;
            }
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
              isError: true,
            };
          }
        }
      );
    }

    // Register comment tools
    for (const tool of commentTools) {
      this.server.tool(
        tool.name,
        tool.description,
        tool.inputSchema.shape,
        async (args) => {
          const token = getToken();
          if (!token) {
            return {
              content: [{ type: "text", text: "Error: No ClickUp API token configured" }],
              isError: true,
            };
          }

          try {
            let result;
            switch (tool.name) {
              case "post_comment":
                result = await postComment(postCommentSchema.parse(args), token);
                break;
              case "get_comments":
                result = await getComments(getCommentsSchema.parse(args), token);
                break;
            }
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
              isError: true,
            };
          }
        }
      );
    }

    // Register custom field tools
    for (const tool of customFieldTools) {
      this.server.tool(
        tool.name,
        tool.description,
        tool.inputSchema.shape,
        async (args) => {
          const token = getToken();
          if (!token) {
            return {
              content: [{ type: "text", text: "Error: No ClickUp API token configured" }],
              isError: true,
            };
          }

          try {
            let result;
            switch (tool.name) {
              case "get_list_custom_fields":
                result = await getListCustomFields(getListCustomFieldsSchema.parse(args), token);
                break;
              case "set_custom_field":
                result = await setCustomField(setCustomFieldSchema.parse(args), token);
                break;
            }
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
              isError: true,
            };
          }
        }
      );
    }

    // Register document tools
    for (const tool of docTools) {
      this.server.tool(
        tool.name,
        tool.description,
        tool.inputSchema.shape,
        async (args) => {
          const token = getToken();
          if (!token) {
            return {
              content: [{ type: "text", text: "Error: No ClickUp API token configured" }],
              isError: true,
            };
          }

          try {
            let result;
            switch (tool.name) {
              case "create_doc":
                result = await createDoc(createDocSchema.parse(args), token);
                break;
              case "get_doc":
                result = await getDoc(getDocSchema.parse(args), token);
                break;
              case "update_page":
                result = await updatePage(updatePageSchema.parse(args), token);
                break;
            }
            return {
              content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            };
          } catch (error) {
            return {
              content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
              isError: true,
            };
          }
        }
      );
    }
  }
}

// Export the MCP server directly (authless mode)
// The /sse endpoint is handled by McpAgent.mount()
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // CORS configuration
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    // Health check / info endpoint
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        JSON.stringify({
          name: "ClickUp Taskmaster MCP",
          version: "1.0.0",
          description: "Remote MCP server for ClickUp task management",
          defaultList: CLICKUP_CONFIG.LIST_ID,
          defaultTeam: CLICKUP_CONFIG.TEAM_ID,
          endpoint: "/sse",
          tools: [
            "list_tasks",
            "get_task",
            "create_task",
            "update_task",
            "get_list_custom_fields",
            "set_custom_field",
            "post_comment",
            "get_comments",
            "create_doc",
            "get_doc",
            "update_page",
          ],
        }, null, 2),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Route MCP endpoints to Durable Object
    // MCP uses /sse for connection and /messages for sending messages
    if (
      url.pathname === "/sse" ||
      url.pathname === "/sse/" ||
      url.pathname.startsWith("/messages")
    ) {
      // Get the Durable Object stub
      const id = env.MCP_OBJECT.idFromName("clickup-taskmaster");
      const stub = env.MCP_OBJECT.get(id);

      // Forward the request to the Durable Object
      const response = await stub.fetch(request);

      // Apply CORS headers to the response
      const newHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        newHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // 404 for unknown routes
    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  },
};
