import { createOpencodeClient } from '@opencode-ai/sdk';
import { Sandbox } from 'e2b';
import type { SubagentConfig } from '@general-agent/agent/config-types';
import { buildOpencodeConfig } from '@general-agent/agent/opencode-config';

type OpencodePart = { text?: string };
type OpencodeMessageEntry = { info?: { role?: string }; parts?: OpencodePart[] };

export interface SandboxEnvVars {
  AI_GATEWAY_API_KEY: string;
  OPENAI_API_KEY: string;
}

export interface SpawnSubagentResult {
  sandboxId: string;
  url: string;
  token: string;
  sessionId: string;
  output: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForOpencodeReady(
  url: string,
  accessToken: string | undefined,
  opts: { retries: number; delayMs: number }
) {
  const headers: HeadersInit = accessToken
    ? { 'e2b-traffic-access-token': accessToken }
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

  throw new Error('OpenCode server not ready (port not open)');
}

/**
 * Spawns a subagent on E2B sandbox with OpenCode
 */
export async function spawnSubagent(
  subagentConfig: SubagentConfig,
  task: string,
  envVars: SandboxEnvVars,
  templateAlias: string = 'general-agent-opencode'
): Promise<SpawnSubagentResult> {
  console.log('[Sandbox Spawner] Starting...', { subagentConfig, task });

  // 1. Create E2B sandbox from custom template with OpenCode pre-installed
  const sandbox = await Sandbox.create(templateAlias, {
    network: {
      allowPublicTraffic: false,
    },
    secure: true, // Requires e2b-traffic-access-token header
    timeoutMs: 5 * 60 * 1000, // 5 minutes
    envs: {
      AI_GATEWAY_API_KEY: envVars.AI_GATEWAY_API_KEY,
      OPENAI_API_KEY: envVars.OPENAI_API_KEY,
    },
  });

  const accessToken = sandbox.trafficAccessToken;
  const sandboxId = sandbox.sandboxId;
  console.log('[Sandbox Spawner] Sandbox created:', sandboxId);

  try {
    // OpenCode is already installed in the template - skip installation step!
    console.log('[Sandbox Spawner] OpenCode is pre-installed');

    const opencodeConfig = buildOpencodeConfig(subagentConfig);
    if (Object.keys(opencodeConfig).length > 0) {
      const configPath = '/home/user/.config/opencode/opencode.json';
      const configJson = JSON.stringify(opencodeConfig, null, 2);

      await sandbox.commands.run('mkdir -p /home/user/.config/opencode');
      await sandbox.commands.run(
        `cat <<'EOF' > ${configPath}
${configJson}
EOF`
      );

      console.log('[Sandbox Spawner] OpenCode config written:', configPath);
    }

    // 2. Upload skills to sandbox
    if (subagentConfig.skills.length > 0) {
      console.log('[Sandbox Spawner] Uploading skills:', subagentConfig.skills);

      for (const skillName of subagentConfig.skills) {
        const remoteSkillPath = `/home/user/.opencode/skills/${skillName}`;

        try {
          // Create skills directory
          await sandbox.commands.run(`mkdir -p ${remoteSkillPath}`);

          // Upload skill files (we'll implement this properly later)
          // For now, we'll create a placeholder SKILL.md
          // TODO: Upload from ./skills/${skillName} folder
          await sandbox.commands.run(
            `echo "# ${skillName}\n\nSkill placeholder" > ${remoteSkillPath}/SKILL.md`
          );

          console.log(`[Sandbox Spawner] Uploaded skill: ${skillName}`);
        } catch (error) {
          console.warn(`[Sandbox Spawner] Failed to upload skill ${skillName}:`, error);
        }
      }
    }

    // 3. Start OpenCode server in background
    console.log('[Sandbox Spawner] Starting OpenCode server...');
    await sandbox.commands.run(
      'opencode serve --port 4096',
      {
        background: true,
        onStdout: (data) => console.log('[OpenCode Server]', data),
        onStderr: (data) => console.error('[OpenCode Server Error]', data),
      }
    );

    // 4. Get exposed port URL
    const host = sandbox.getHost(4096);
    const url = `https://${host}`;
    console.log('[Sandbox Spawner] OpenCode available at:', url);

    await waitForOpencodeReady(url, accessToken, { retries: 10, delayMs: 1000 });

    const client = createOpencodeClient({
      baseUrl: url,
      fetch: accessToken
        ? (input: RequestInfo | URL, init?: RequestInit) => {
          if (input instanceof Request) {
            const headers = new Headers(input.headers);
            headers.set('e2b-traffic-access-token', accessToken);
            return fetch(new Request(input, { headers }));
          }

          const headers = new Headers(init?.headers);
          headers.set('e2b-traffic-access-token', accessToken);
          return fetch(input, { ...init, headers });
        }
        : fetch,
    });

    // 5. Create session in OpenCode
    console.log('[Sandbox Spawner] Creating OpenCode session...');
    const session = await client.session.create({
      body: { title: `Subagent: ${subagentConfig.name}` },
    });
    if (session.error) {
      throw new Error(
        `OpenCode session create failed: ${JSON.stringify(session.error)}`
      );
    }
    if (!session.data?.id) {
      throw new Error('OpenCode session create returned no id');
    }
    const sessionId = session.data.id;
    console.log('[Sandbox Spawner] Session created:', sessionId);

    // 6. Send task message to OpenCode
    console.log('[Sandbox Spawner] Sending task to OpenCode...');
    const messageResult = await client.session.prompt({
      path: { id: sessionId },
      body: {
        ...(subagentConfig.systemPrompt
          ? { system: subagentConfig.systemPrompt }
          : {}),
        parts: [{ type: 'text', text: task }],
      },
    });
    if (messageResult.error) {
      throw new Error(
        `OpenCode prompt failed: ${JSON.stringify(messageResult.error)}`
      );
    }
    console.log('[Sandbox Spawner] Task sent, response:', messageResult.data);

    // 7. Get messages to extract output
    const messages = await client.session.messages({ path: { id: sessionId } });
    const assistantMessages = (messages.data as OpencodeMessageEntry[]).filter(
      (entry) => entry.info?.role === 'assistant'
    );
    const output = assistantMessages
      .map((entry) => {
        if (!Array.isArray(entry.parts)) return '';
        return entry.parts.map((part) => part.text || '').join('\n');
      })
      .join('\n\n');

    console.log('[Sandbox Spawner] Task completed');

    return {
      sandboxId,
      url,
      token: accessToken || '',
      sessionId,
      output: output || 'Task executed successfully',
    };

  } catch (error) {
    console.error('[Sandbox Spawner] Error:', error);

    // Cleanup sandbox on error
    try {
      await sandbox.kill();
    } catch (cleanupError) {
      console.error('[Sandbox Spawner] Cleanup error:', cleanupError);
    }

    throw error;
  }
}

/**
 * Kill a running sandbox
 */
export async function killSandbox(sandboxId: string): Promise<void> {
  console.log('[Sandbox Spawner] Killing sandbox:', sandboxId);
  const sandbox = await Sandbox.connect(sandboxId);
  await sandbox.kill();
  console.log('[Sandbox Spawner] Sandbox killed');
}
