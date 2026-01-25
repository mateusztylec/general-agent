import { z } from "zod";

export const OpencodePermissionPolicySchema = z.enum(["allow", "deny"]);

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

export const OpencodePermissionMapSchema = z
	.object({
		bash: OpencodePermissionPolicySchema.optional(),
		edit: OpencodePermissionPolicySchema.optional(),
		write: OpencodePermissionPolicySchema.optional(),
		read: OpencodePermissionPolicySchema.optional(),
		grep: OpencodePermissionPolicySchema.optional(),
		glob: OpencodePermissionPolicySchema.optional(),
		list: OpencodePermissionPolicySchema.optional(),
		lsp: OpencodePermissionPolicySchema.optional(),
		patch: OpencodePermissionPolicySchema.optional(),
		skill: OpencodePermissionPolicySchema.optional(),
		todowrite: OpencodePermissionPolicySchema.optional(),
		todoread: OpencodePermissionPolicySchema.optional(),
		webfetch: OpencodePermissionPolicySchema.optional(),
		question: OpencodePermissionPolicySchema.optional(),
	})
	.strict();

export const OpencodeToolsMapSchema = z
	.object({
		bash: z.boolean().optional(),
		edit: z.boolean().optional(),
		write: z.boolean().optional(),
		read: z.boolean().optional(),
		grep: z.boolean().optional(),
		glob: z.boolean().optional(),
		list: z.boolean().optional(),
		lsp: z.boolean().optional(),
		patch: z.boolean().optional(),
		skill: z.boolean().optional(),
		todowrite: z.boolean().optional(),
		todoread: z.boolean().optional(),
		webfetch: z.boolean().optional(),
		question: z.boolean().optional(),
	})
	.strict();

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

// LLM configuration with credential reference
export const LLMConfigSchema = z.object({
	provider: z.enum(["openai", "anthropic", "google"]),
	model: z.string(),
	systemPrompt: z.string(),
	apiKeyCredentialId: z.string().optional(), // Reference to credentials table
});

// Extended LLM config for subagents with small_model support
export const SubagentLLMConfigSchema = LLMConfigSchema.extend({
	small_model: z.string().optional(),
});

// Storage configuration with credential reference
export const StorageConfigSchema = z.object({
	type: z.enum(["s3", "r2"]),
	credentialId: z.string().optional(), // References credentials table
	config: z.record(z.string(), z.unknown()).optional(), // Non-secret config like bucket name, region
});

export const SandboxConfigSchema = z
	.object({
		internetAccess: z.boolean().default(false),
	})
	.strict();

export const MainAgentConfigSchema = z.object({
	llm: LLMConfigSchema,
});

export const SubagentConfigSchema = z.object({
	name: z.string(),
	description: z.string(),
	skills: z.array(z.string()),
	storage: z.array(StorageConfigSchema),
	sandbox: SandboxConfigSchema.default({ internetAccess: false }),
	llm: SubagentLLMConfigSchema.optional(),
	tools: OpencodeToolsMapSchema.optional(),
	permission: OpencodePermissionMapSchema.optional(),
});

export const AgentConfigSchema = z.object({
	name: z.string(),
	mainAgent: MainAgentConfigSchema,
	subagents: z.array(SubagentConfigSchema),
});

/**
 * Subagent tool definitions with descriptions
 * These are the OpenCode tools available to subagents running in sandboxes
 */
export const SUBAGENT_TOOL_DEFINITIONS = {
	bash: {
		name: "bash",
		description: "Execute bash commands in the sandbox",
	},
	edit: {
		name: "edit",
		description: "Edit existing files",
	},
	write: {
		name: "write",
		description: "Write or create new files",
	},
	read: {
		name: "read",
		description: "Read file contents",
	},
	grep: {
		name: "grep",
		description: "Search for patterns in files",
	},
	glob: {
		name: "glob",
		description: "Find files matching patterns",
	},
	list: {
		name: "list",
		description: "List directory contents",
	},
	lsp: {
		name: "lsp",
		description: "Language server protocol operations",
	},
	patch: {
		name: "patch",
		description: "Apply patches to files",
	},
	skill: {
		name: "skill",
		description: "Execute custom skills",
	},
	todowrite: {
		name: "todowrite",
		description: "Write todo items",
	},
	todoread: {
		name: "todoread",
		description: "Read todo items",
	},
	webfetch: {
		name: "webfetch",
		description: "Fetch content from the web",
	},
	question: {
		name: "question",
		description: "Ask questions to the user",
	},
} as const satisfies Record<
	z.infer<typeof AvailableToolSchema>,
	{ name: string; description: string }
>;

export type OpencodePermissionPolicy = z.infer<
	typeof OpencodePermissionPolicySchema
>;
export type OpencodePermissionMap = z.infer<typeof OpencodePermissionMapSchema>;
export type AvailableTool = z.infer<typeof AvailableToolSchema>;
export type OpencodeToolsMap = Partial<Record<AvailableTool, boolean>>;
export type OpencodeAgentConfig = z.infer<typeof OpencodeAgentConfigSchema>;
export type OpencodeConfigCore = z.infer<typeof OpencodeConfigCoreSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type SubagentLLMConfig = z.infer<typeof SubagentLLMConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type SandboxConfig = z.infer<typeof SandboxConfigSchema>;
export type MainAgentConfig = z.infer<typeof MainAgentConfigSchema>;
export type SubagentConfig = z.infer<typeof SubagentConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ParsedAgentConfig = AgentConfig;

export function parseAgentConfig(value: unknown): ParsedAgentConfig {
	return AgentConfigSchema.parse(value);
}
