import type { AgentConfig } from "@general-agent/agent/config-types";
import {
	AGENT_TOOL_DEFINITIONS,
	OpencodeConfigCoreSchema,
} from "@general-agent/agent/config-types";

function omitUndefined<T extends Record<string, unknown>>(value: T) {
	return Object.fromEntries(
		Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
	) as Partial<T>;
}

export function buildOpencodeConfig(
	agent: AgentConfig,
): ReturnType<typeof OpencodeConfigCoreSchema.parse> {
	const allTools = Object.keys(AGENT_TOOL_DEFINITIONS) as Array<
		keyof typeof AGENT_TOOL_DEFINITIONS
	>;
	const tools = Object.fromEntries(
		allTools.map((tool) => [tool, agent.tools?.[tool] === true]),
	) as Record<keyof typeof AGENT_TOOL_DEFINITIONS, boolean>;

	const config = omitUndefined({
		// provider: agent.llm?.provider, // TODO: don't needed for now. later we need to handle that but it is not as simple as putting name here.
		model: agent.llm?.model,
		small_model: agent.llm?.small_model,
		tools,
		permission: agent.permission,
	});

	return OpencodeConfigCoreSchema.parse(config);
}
