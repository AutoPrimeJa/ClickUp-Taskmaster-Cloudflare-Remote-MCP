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

// Use McpAgent.mount() - the CORRECT way for Cloudflare MCP servers
// This handles /sse, /message, SSE protocol, and CORS automatically
export default ClickUpMCP.mount("/sse");
