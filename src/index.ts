/**
 * ClickUp Taskmaster - Remote MCP Server on Cloudflare Workers
 *
 * This server provides ClickUp task management capabilities via MCP protocol.
 * It connects to a SPECIFIC ClickUp list (ID: 176135389) by default.
 *
 * Supports:
 * - OAuth 2.1 authentication (for Claude.ai integrations)
 * - API token authentication (for simpler setups)
 * - SSE transport for real-time communication
 */

import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import OAuthProvider from "@cloudflare/workers-oauth-provider";
import { Hono } from "hono";

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

// Props passed through OAuth
interface UserProps {
  accessToken: string;
  userId?: string;
}

// State for the MCP session
interface State {
  lastListId?: string;
}

/**
 * ClickUp MCP Server - Durable Object
 * Each user session gets its own instance
 */
export class ClickUpMCP extends McpAgent<Env, State, UserProps> {
  server = new McpServer({
    name: "clickup-taskmaster",
    version: "1.0.0",
  });

  initialState: State = {};

  async init() {
    // Get the API token from props (OAuth) or environment (simple auth)
    const getToken = (): string => {
      return this.props?.accessToken || this.env.CLICKUP_API_TOKEN || "";
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

// Simple API handler for non-OAuth setups
const app = new Hono<{ Bindings: Env }>();

// Health check
app.get("/", (c) => {
  return c.json({
    name: "ClickUp Taskmaster MCP",
    version: "1.0.0",
    description: "Remote MCP server for ClickUp task management",
    defaultList: CLICKUP_CONFIG.LIST_ID,
    defaultTeam: CLICKUP_CONFIG.TEAM_ID,
    endpoints: {
      sse: "/sse",
      oauth: {
        authorize: "/authorize",
        token: "/token",
        callback: "/callback",
      },
    },
  });
});

// Export the OAuth provider wrapper
// This handles /authorize, /token, /register, /callback, and /sse routes
export default new OAuthProvider({
  apiRoute: "/sse",
  apiHandler: ClickUpMCP.mount("/sse"),
  defaultHandler: app,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});

// Re-export the Durable Object class
export { ClickUpMCP as DurableObject };
