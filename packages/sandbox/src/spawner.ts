import type { AgentConfig } from "@general-agent/agent/config-types";
import { buildOpencodeConfig } from "@general-agent/agent/opencode-config";
import { createOpencodeClient } from "@opencode-ai/sdk";
import { Sandbox } from "e2b";
import {
  type DecryptedCredential,
  type MountResult,
  mountAllStorage,
} from "./storage";
import {
  uploadCustomSkillsToSandbox,
  installPrebuiltSkill,
} from "./skills";
import {
  getPrebuiltSkill,
  type PrebuiltSkill,
} from "@general-agent/agent/skills/prebuilt";
import { getSkillsByIds } from "@general-agent/database/queries/skills";

type OpencodePart = { text?: string };
type OpencodeMessageEntry = {
  info?: { role?: string };
  parts?: OpencodePart[];
};

export interface SandboxEnvVars {
  AI_GATEWAY_API_KEY?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_ORGANIZATION?: string;
}

export type GetCredentialFn = (id: string) => Promise<DecryptedCredential>;

export interface SpawnAgentResult {
  sandboxId: string;
  url: string;
  token: string;
  sessionId: string;
  output: string;
  mountResults?: MountResult[];
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForOpencodeReady(
  url: string,
  accessToken: string | undefined,
  opts: { retries: number; delayMs: number },
) {
  const headers: HeadersInit = accessToken
    ? { "e2b-traffic-access-token": accessToken }
    : {};

  for (let attempt = 0; attempt <= opts.retries; attempt += 1) {
    try {
      const response = await fetch(`${url}/global/health`, { headers });
      if (response.ok) {
        return;
      }
    } catch {
      // ignore and retry
    }

    if (attempt < opts.retries) {
      await sleep(opts.delayMs);
    }
  }

  throw new Error("OpenCode server not ready (port not open)");
}

export interface AgentSession {
  sandboxId: string;
  url: string;
  token: string;
  sessionId: string;
  client: ReturnType<typeof createOpencodeClient>;
  cleanup: () => Promise<void>;
  mountResults: MountResult[];
}

/**
 * Phase 1: Create sandbox and OpenCode session (before sending prompt)
 * This allows registering the session in DB before any events are generated
 */
export async function createAgentSession(
  agentConfig: AgentConfig,
  envVars: SandboxEnvVars,
  getCredential: GetCredentialFn,
  templateAlias = "general-agent-opencode",
): Promise<AgentSession> {
  console.log("[Sandbox Spawner] Phase 1: Creating session...");

  // 1. Create E2B sandbox from custom template with OpenCode pre-installed
  // Filter out undefined env vars
  const filteredEnvs = Object.fromEntries(
    Object.entries(envVars).filter(([, value]) => value !== undefined)
  ) as Record<string, string>;

  const sandbox = await Sandbox.create(templateAlias, {
    // TODO: implement
    // allowInternetAccess: agentConfig.sandbox?.internetAccess ?? false,
    network: {
      allowPublicTraffic: false,
    },
    secure: true, // Requires e2b-traffic-access-token header
    timeoutMs: 5 * 60 * 1000, // 5 minutes
    envs: filteredEnvs,
  });

  const accessToken = sandbox.trafficAccessToken;
  const sandboxId = sandbox.sandboxId;
  console.log("[Sandbox Spawner] Sandbox created:", sandboxId);

  try {
    // OpenCode is already installed in the template - skip installation step!
    console.log("[Sandbox Spawner] OpenCode is pre-installed");

    const opencodeConfig = buildOpencodeConfig(agentConfig);
    if (Object.keys(opencodeConfig).length > 0) {
      const configPath = "/home/user/.config/opencode/opencode.json";
      const configJson = JSON.stringify(opencodeConfig, null, 2);

      await sandbox.commands.run("mkdir -p /home/user/.config/opencode");
      await sandbox.commands.run(
        `cat <<'EOF' > ${configPath}
${configJson}
EOF`,
      );

      console.log("[Sandbox Spawner] OpenCode config written:", configPath);
    }

    // 2. Mount storage buckets
    let mountResults: MountResult[] = [];
    if (agentConfig.storage && agentConfig.storage.length > 0) {
      console.log("[Sandbox Spawner] Mounting storage buckets...");
      mountResults = await mountAllStorage({
        sandbox,
        storageConfigs: agentConfig.storage,
        getCredential,
      });
    }

    // 3. Install pre-built skills and upload custom skills
    const skills = agentConfig.skills || { prebuilt: [], custom: [] };

    // 3a. Install pre-built skills via npx
    if (skills.prebuilt && skills.prebuilt.length > 0) {
      console.log(`[Sandbox Spawner] Installing ${skills.prebuilt.length} pre-built skill(s)...`);
      for (const skillName of skills.prebuilt) {
        const prebuiltSkill = getPrebuiltSkill(skillName);
        if (!prebuiltSkill) {
          console.warn(`[Sandbox Spawner] Unknown pre-built skill: ${skillName}, skipping`);
          continue;
        }
        await installPrebuiltSkill(sandbox, prebuiltSkill);
      }
    }

    // 3b. Upload custom user-created skills from local storage
    if (skills.custom && skills.custom.length > 0) {
      console.log(`[Sandbox Spawner] Uploading ${skills.custom.length} custom skill(s)...`);
      const customSkills = await getSkillsByIds(skills.custom);
      const customSkillNames = customSkills.map((s) => s.name);
      await uploadCustomSkillsToSandbox(sandbox, customSkillNames);
    }

    // 4. Start OpenCode server in background
    console.log("[Sandbox Spawner] Starting OpenCode server...");
    await sandbox.commands.run(
      "opencode serve --hostname 0.0.0.0 --port 4096",
      {
        background: true,
        onStdout: (data) => console.log("[OpenCode Server]", data),
        onStderr: (data) => console.error("[OpenCode Server Error]", data),
      },
    );

    // 5. Get exposed port URL
    const host = sandbox.getHost(4096);
    const url = `https://${host}`;
    console.log("[Sandbox Spawner] OpenCode available at:", url);

    await waitForOpencodeReady(url, accessToken, {
      retries: 10,
      delayMs: 1000,
    });

    const client = createOpencodeClient({
      baseUrl: url,
      headers: {
        "e2b-traffic-access-token": accessToken,
      },
    });

    // 6. Create session in OpenCode (but DON'T send prompt yet!)
    console.log("[Sandbox Spawner] Creating OpenCode session...");
    const session = await client.session.create({
      body: { title: "Agent session" },
    });
    if (session.error) {
      throw new Error(
        `OpenCode session create failed: ${JSON.stringify(session.error)}`,
      );
    }
    if (!session.data?.id) {
      throw new Error("OpenCode session create returned no id");
    }
    const sessionId = session.data.id;
    console.log("[Sandbox Spawner] Session created:", sessionId);
    console.log("[Sandbox Spawner] Phase 1 complete - ready to register in DB");

    return {
      sandboxId,
      url,
      token: accessToken || "",
      sessionId,
      client,
      mountResults,
      cleanup: async () => {
        try {
          console.log("[Sandbox Spawner] Cleaning up sandbox:", sandboxId);
          await sandbox.kill();
        } catch (error) {
          console.error("[Sandbox Spawner] Cleanup error:", error);
        }
      },
    };
  } catch (error) {
    console.error("[Sandbox Spawner] Phase 1 error:", error);

    // Cleanup sandbox on error
    try {
      await sandbox.kill();
    } catch (cleanupError) {
      console.error("[Sandbox Spawner] Cleanup error:", cleanupError);
    }

    throw error;
  }
}

/**
 * Phase 2: Send prompt and execute task
 * Call this AFTER registering the session in DB so frontend can subscribe
 */
export async function executeAgentTask(
  session: AgentSession,
  agentConfig: AgentConfig,
  task: string,
): Promise<SpawnAgentResult> {
  console.log("[Sandbox Spawner] Phase 2: Executing task...", { task });

  try {
    // Send task message to OpenCode
    console.log("[Sandbox Spawner] Sending task to OpenCode...");
    const messageResult = await session.client.session.prompt({
      path: { id: session.sessionId },
      body: {
        ...(agentConfig.llm?.systemPrompt
          ? { system: agentConfig.llm.systemPrompt }
          : {}),
        parts: [{ type: "text", text: task }],
      },
    });
    if (messageResult.error) {
      throw new Error(
        `OpenCode prompt failed: ${JSON.stringify(messageResult.error)}`,
      );
    }
    console.log("[Sandbox Spawner] Task sent, response:", messageResult.data);

    // Get messages to extract output
    const messages = await session.client.session.messages({
      path: { id: session.sessionId },
    });
    const assistantMessages = (messages.data as OpencodeMessageEntry[]).filter(
      (entry) => entry.info?.role === "assistant",
    );
    const output = assistantMessages
      .map((entry) => {
        if (!Array.isArray(entry.parts)) return "";
        return entry.parts.map((part) => part.text || "").join("\n");
      })
      .join("\n\n");

    console.log("[Sandbox Spawner] Phase 2 complete - task executed");

    return {
      sandboxId: session.sandboxId,
      url: session.url,
      token: session.token,
      sessionId: session.sessionId,
      output: output || "Task executed successfully",
      mountResults: session.mountResults,
    };
  } catch (error) {
    console.error("[Sandbox Spawner] Phase 2 error:", error);
    await session.cleanup();
    throw error;
  }
}

/**
 * Kill a running sandbox
 */
export async function killSandbox(sandboxId: string): Promise<void> {
  console.log("[Sandbox Spawner] Killing sandbox:", sandboxId);
  const sandbox = await Sandbox.connect(sandboxId);
  await sandbox.kill();
  console.log("[Sandbox Spawner] Sandbox killed");
}
