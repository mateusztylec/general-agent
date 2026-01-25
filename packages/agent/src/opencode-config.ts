import type { SubagentConfig } from "@general-agent/agent/config-types";
import { OpencodeConfigCoreSchema } from "@general-agent/agent/config-types";

function omitUndefined<T extends Record<string, unknown>>(value: T) {
	return Object.fromEntries(
		Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
	) as Partial<T>;
}

export function buildOpencodeConfig(
	subagent: SubagentConfig,
): ReturnType<typeof OpencodeConfigCoreSchema.parse> {
	const config = omitUndefined({
    // provider: subagent.llm?.provider, // TODO: don't needed for now. later we need to handle that but it is not as simple as putting name here.
		model: subagent.llm?.model,
		small_model: subagent.llm?.small_model,
		tools: subagent.tools,
		permission: subagent.permission,
	});

	return OpencodeConfigCoreSchema.parse(config);
}
