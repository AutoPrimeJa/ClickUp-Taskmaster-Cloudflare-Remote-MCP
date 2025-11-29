import { z } from "zod";
import { CLICKUP_CONFIG } from "../config";

// Schema definitions for comment tools
export const postCommentSchema = z.object({
  task_id: z.string().describe("The ID of the task to comment on"),
  comment_text: z.string().describe("The comment content"),
  assignee: z.number().optional().describe("User ID to assign the comment to"),
  notify_all: z.boolean().optional().default(true),
});

export const getCommentsSchema = z.object({
  task_id: z.string().describe("The ID of the task to get comments from"),
});

// Tool definitions
export const commentTools = [
  {
    name: "post_comment",
    description: "Add a comment to a task. Use this to add notes, updates, or communicate with team members on a task.",
    inputSchema: postCommentSchema,
  },
  {
    name: "get_comments",
    description: "Get all comments from a task. Use this to see the discussion history on a task.",
    inputSchema: getCommentsSchema,
  },
];

// API call implementations
export async function postComment(args: z.infer<typeof postCommentSchema>, apiToken: string) {
  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/task/${args.task_id}/comment`,
    {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment_text: args.comment_text,
        assignee: args.assignee,
        notify_all: args.notify_all,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

export async function getComments(args: z.infer<typeof getCommentsSchema>, apiToken: string) {
  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/task/${args.task_id}/comment`,
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
