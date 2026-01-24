import { z } from "zod";

export const OpencodePermissionPolicySchema = z.enum(["allow", "deny"]);
export const OpencodePermissionMapSchema = z.record(
  z.string(),
  OpencodePermissionPolicySchema
);
export const AvailableToolSchema = z.enum([
  "bash",
  "edit",
  "write",
  "read",
  "grep",
  "glob",
  "list",
  "lsp",
  "patch",
  "skill",
  "todowrite",
  "todoread",
  "webfetch",
  "question",
]);

export const OpencodeToolsMapSchema = z.record(AvailableToolSchema, z.boolean());

export const OpencodeAgentConfigSchema = z.object({
  description: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  tools: OpencodeToolsMapSchema.optional(),
  permission: OpencodePermissionMapSchema.optional(),
  temperature: z.number().optional(),
  hidden: z.boolean().optional(),
  mode: z.enum(["primary", "subagent", "all"]).optional(),
});

export const OpencodeConfigCoreSchema = z.object({
  model: z.string().optional(),
  small_model: z.string().optional(),
  tools: OpencodeToolsMapSchema.optional(),
  permission: OpencodePermissionMapSchema.optional(),
});

export const MainAgentConfigSchema = z.object({
  systemPrompt: z.string(),
  model: z.string(),
});

export const SubagentConfigSchema = z.object({
  name: z.string(),
  systemPrompt: z.string(),
  description: z.string(),
  skills: z.array(z.string()),
  storage: z.array(z.unknown()),
  model: z.string().optional(),
  small_model: z.string().optional(),
  tools: OpencodeToolsMapSchema.optional(),
  permission: OpencodePermissionMapSchema.optional(),
});

export const AgentConfigSchema = z.object({
  name: z.string(),
  mainAgent: MainAgentConfigSchema,
  subagents: z.array(SubagentConfigSchema),
});

export type OpencodePermissionPolicy = z.infer<
  typeof OpencodePermissionPolicySchema
>;
export type OpencodePermissionMap = z.infer<
  typeof OpencodePermissionMapSchema
>;
export type AvailableTool = z.infer<typeof AvailableToolSchema>;
export type OpencodeToolsMap = Record<AvailableTool, boolean>;
export type OpencodeAgentConfig = z.infer<typeof OpencodeAgentConfigSchema>;
export type OpencodeConfigCore = z.infer<typeof OpencodeConfigCoreSchema>;
export type MainAgentConfig = z.infer<typeof MainAgentConfigSchema>;
export type SubagentConfig = z.infer<typeof SubagentConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ParsedAgentConfig = AgentConfig;

export function parseAgentConfig(value: unknown): ParsedAgentConfig {
  return AgentConfigSchema.parse(value);
}
