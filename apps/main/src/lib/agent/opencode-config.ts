import type { SubagentConfig } from "@/lib/config/agent-config-types";
import { OpencodeConfigCoreSchema } from "@/lib/config/agent-config-types";

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as Partial<T>;
}

export function buildOpencodeConfig(
  subagent: SubagentConfig,
): ReturnType<typeof OpencodeConfigCoreSchema.parse> {
  const config = omitUndefined({
    model: subagent.model,
    small_model: subagent.small_model,
    tools: subagent.tools,
    permission: subagent.permission,
  });

  return OpencodeConfigCoreSchema.parse(config);
}
