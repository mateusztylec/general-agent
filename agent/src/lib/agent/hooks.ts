import { HookCallback, PreToolUseHookInput } from "@anthropic-ai/claude-agent-sdk";

export const guardRead: HookCallback = async (input, toolUseID, { signal }) => {
  // Narrow the union so the returned hookSpecificOutput type matches "PreToolUse"
  if (input.hook_event_name !== "PreToolUse") return {};
  const preInput = input as PreToolUseHookInput;

  // Extract the file path from the tool's input arguments (SDK types tool_input as {})
  const toolInput = preInput.tool_input as { file_path?: unknown } | undefined;
  const rawPath = typeof toolInput?.file_path === "string" ? toolInput.file_path : "";
  const normalized = rawPath.replace(/\\/g, "/"); // handle Windows-style slashes just in case

  // Allow only within ./.claude/skills (block ../ traversal + other dirs)
  const allowedPrefix = ".claude/skills/";
  const isAllowed =
    normalized === ".claude/skills" ||
    normalized === ".claude/skills/" ||
    normalized.startsWith(allowedPrefix);

  if (!isAllowed) {
    return {
      hookSpecificOutput: {
        hookEventName: preInput.hook_event_name,
        permissionDecision: "deny",
        permissionDecisionReason: "Only ./.claude/skills is allowed",
      },
    };
  }

  return {};
};