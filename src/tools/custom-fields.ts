import { z } from "zod";
import { CLICKUP_CONFIG } from "../config";

// Schema definitions for custom field tools
export const getListCustomFieldsSchema = z.object({
  list_id: z.string().optional().describe(`List ID to get custom fields from (defaults to ${CLICKUP_CONFIG.LIST_ID})`),
});

export const setCustomFieldSchema = z.object({
  task_id: z.string().describe("The ID of the task"),
  field_id: z.string().describe("The UUID of the custom field"),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
    .describe("The value to set (type depends on field type)"),
});

// Tool definitions
export const customFieldTools = [
  {
    name: "get_list_custom_fields",
    description: `Discover all custom fields available on a list (defaults to list ${CLICKUP_CONFIG.LIST_ID}). Returns field IDs, names, types, and valid options for dropdowns. Use this to understand what custom fields exist before reading or setting them.`,
    inputSchema: getListCustomFieldsSchema,
  },
  {
    name: "set_custom_field",
    description: "Set the value of a custom field on a task. First use get_list_custom_fields to discover field IDs and valid values.",
    inputSchema: setCustomFieldSchema,
  },
];

// API call implementations
export async function getListCustomFields(args: z.infer<typeof getListCustomFieldsSchema>, apiToken: string) {
  const listId = args.list_id || CLICKUP_CONFIG.LIST_ID;

  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/list/${listId}/field`,
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

  // Format the response to be more useful for Claude
  const fields = data.fields || [];
  const formattedFields = fields.map((field: any) => ({
    id: field.id,
    name: field.name,
    type: field.type,
    type_config: field.type_config,
    // For dropdowns, include the options
    options: field.type_config?.options?.map((opt: any) => ({
      id: opt.id,
      name: opt.name,
      color: opt.color,
    })),
    // Include any other useful metadata
    required: field.required,
  }));

  return {
    list_id: listId,
    fields: formattedFields,
    summary: `Found ${formattedFields.length} custom fields: ${formattedFields.map((f: any) => f.name).join(", ")}`,
  };
}

export async function setCustomField(args: z.infer<typeof setCustomFieldSchema>, apiToken: string) {
  const response = await fetch(
    `${CLICKUP_CONFIG.API_URL}/task/${args.task_id}/field/${args.field_id}`,
    {
      method: "POST",
      headers: {
        Authorization: apiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ value: args.value }),
    }
  );

  if (!response.ok) {
    throw new Error(`ClickUp API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}
