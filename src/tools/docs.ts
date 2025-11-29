import { z } from "zod";
import { CLICKUP_CONFIG } from "../config";

// Schema definitions for document tools
export const createDocSchema = z.object({
  workspace_id: z.string().optional().default(CLICKUP_CONFIG.TEAM_ID),
  name: z.string().describe("Document name"),
  content: z.string().optional().describe("Initial content (Markdown supported)"),
  parent: z.string().optional().describe("Parent Folder or List ID"),
});

export const getDocSchema = z.object({
  doc_id: z.string().describe("The ID of the document to retrieve"),
});

export const updatePageSchema = z.object({
  page_id: z.string().describe("The ID of the page to update"),
  content: z.string().describe("New content for the page"),
});

// Tool definitions
export const docTools = [
  {
    name: "create_doc",
    description: `Create a new ClickUp Doc in your workspace (defaults to workspace ${CLICKUP_CONFIG.TEAM_ID}). Supports Markdown content.`,
    inputSchema: createDocSchema,
  },
  {
    name: "get_doc",
    description: "Get a specific ClickUp Doc by its ID.",
    inputSchema: getDocSchema,
  },
  {
    name: "update_page",
    description: "Update a page within a ClickUp Doc with new content.",
    inputSchema: updatePageSchema,
  },
];

// API call implementations
export async function createDoc(args: z.infer<typeof createDocSchema>, apiToken: string) {
  const workspaceId = args.workspace_id || CLICKUP_CONFIG.TEAM_ID;

  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/workspace/${workspaceId}/doc`,
    {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: args.name,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function getDoc(args: z.infer<typeof getDocSchema>, apiToken: string) {
  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/doc/${args.doc_id}`,
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

export async function updatePage(args: z.infer<typeof updatePageSchema>, apiToken: string) {
  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/page/${args.page_id}`,
    {
      method: "PUT",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: args.content,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
