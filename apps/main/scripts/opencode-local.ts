import { Sandbox } from "e2b";

const OPENCODE_PORT = 4096;
const SANDBOX_TEMPLATE = "general-agent-opencode";

async function main() {
  console.log("[OpenCode Local] Creating E2B sandbox...");

  const sandbox = await Sandbox.create(SANDBOX_TEMPLATE, {
    network: {
      allowPublicTraffic: true,
    },
    secure: true,
    timeoutMs: 10 * 60 * 1000,
    envs: {
      ...(process.env.AI_GATEWAY_API_KEY
        ? { AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY }
        : {}),
      ...(process.env.OPENAI_API_KEY
        ? { OPENAI_API_KEY: process.env.OPENAI_API_KEY }
        : {}),
      ...(process.env.ANTHROPIC_API_KEY
        ? { ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY }
        : {}),
    },
  });

  const accessToken = sandbox.trafficAccessToken;
  const sandboxId = sandbox.sandboxId;

  console.log("[OpenCode Local] Sandbox created:", sandboxId);
  console.log("[OpenCode Local] Starting OpenCode Web...");

  await sandbox.commands.run(`opencode web --hostname 0.0.0.0 --port ${OPENCODE_PORT}`, {
    background: true,
    onStdout: (data) => console.log("[OpenCode Web]", data),
    onStderr: (data) => console.error("[OpenCode Web Error]", data),
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const host = sandbox.getHost(OPENCODE_PORT);
  const url = `https://${host}`;

  console.log("\n[OpenCode Local] Ready:");
  console.log("URL:", url);
  console.log("Sandbox ID:", sandboxId);
  if (accessToken) {
    console.log("E2B traffic token:", accessToken);
  } else {
    console.log("E2B traffic token: (not provided)");
  }
}

main().catch((error) => {
  console.error("[OpenCode Local] Error:", error);
  process.exit(1);
});
