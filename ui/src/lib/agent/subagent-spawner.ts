import { Sandbox } from 'e2b';

export interface SubagentConfig {
  name: string;
  systemPrompt: string;
  description: string;
  skills: string[];
  storage: any[];
}

export interface SpawnSubagentResult {
  sandboxId: string;
  url: string;
  token: string;
  output: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  opts: { retries: number; baseDelayMs: number }
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt += 1) {
    try {
      const response = await fetch(input, init);
      if (response.ok) {
        return response;
      }
      if (response.status < 500 && response.status !== 429) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < opts.retries) {
      const delayMs = opts.baseDelayMs * 2 ** attempt;
      await sleep(delayMs);
    }
  }

  throw lastError ?? new Error('Failed after retries');
}

/**
 * Spawns a subagent on E2B sandbox with OpenCode
 */
export async function spawnSubagent(
  subagentConfig: SubagentConfig,
  task: string
): Promise<SpawnSubagentResult> {
  console.log('[Subagent Spawner] Starting...', { subagentConfig, task });

  // 1. Create E2B sandbox from custom template with OpenCode pre-installed
  // Run `bun run scripts/build-sandbox-template.ts` first to build the template
  const sandbox = await Sandbox.create('general-agent-opencode', {
    network: {
      allowPublicTraffic: false,
    },
    secure: true, // Requires e2b-traffic-access-token header
    timeoutMs: 5 * 60 * 1000, // 5 minutes,
  });

  const accessToken = sandbox.trafficAccessToken; // Property, not method
  const sandboxId = sandbox.sandboxId;
  console.log('[Subagent Spawner] Sandbox created:', sandboxId);

  try {
    // OpenCode is already installed in the template - skip installation step!
    console.log('[Subagent Spawner] OpenCode is pre-installed');

    // 2. Upload skills to sandbox
    if (subagentConfig.skills.length > 0) {
      console.log('[Subagent Spawner] Uploading skills:', subagentConfig.skills);

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

          console.log(`[Subagent Spawner] Uploaded skill: ${skillName}`);
        } catch (error) {
          console.warn(`[Subagent Spawner] Failed to upload skill ${skillName}:`, error);
        }
      }
    }

    // 3. Start OpenCode server in background
    console.log('[Subagent Spawner] Starting OpenCode server...');
    await sandbox.commands.run(
      'opencode serve --port 4096',
      {
        background: true,
        onStdout: (data) => console.log('[OpenCode Server]', data),
        onStderr: (data) => console.error('[OpenCode Server Error]', data),
      }
    );

    // Wait a bit for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 4. Get exposed port URL
    const host = sandbox.getHost(4096);
    const url = `https://${host}`;
    console.log('[Subagent Spawner] OpenCode available at:', url);

    // 5. Create session in OpenCode
    console.log('[Subagent Spawner] Creating OpenCode session...');
    const sessionHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      sessionHeaders['e2b-traffic-access-token'] = accessToken;
    }

    const createSessionResponse = await fetchWithRetry(`${url}/session`, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({
        title: `Subagent: ${subagentConfig.name}`,
      }),
    }, { retries: 3, baseDelayMs: 500 });

    if (!createSessionResponse.ok) {
      throw new Error(`Failed to create session: ${createSessionResponse.statusText}`);
    }

    const session = await createSessionResponse.json();
    const sessionId = session.id;
    console.log('[Subagent Spawner] Session created:', sessionId);

    // 6. Send task message to OpenCode
    console.log('[Subagent Spawner] Sending task to OpenCode...');
    const messageHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      messageHeaders['e2b-traffic-access-token'] = accessToken;
    }

    const messageResponse = await fetch(`${url}/session/${sessionId}/message`, {
      method: 'POST',
      headers: messageHeaders,
      body: JSON.stringify({
        system: subagentConfig.systemPrompt,
        parts: [
          {
            type: 'text',
            text: task,
          },
        ],
      }),
    });

    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.statusText}`);
    }

    const messageResult = await messageResponse.json();
    console.log('[Subagent Spawner] Task sent, response:', messageResult);

    // 7. Get messages to extract output
    const getHeaders: Record<string, string> = {};
    if (accessToken) {
      getHeaders['e2b-traffic-access-token'] = accessToken;
    }

    const messagesResponse = await fetch(`${url}/session/${sessionId}/message`, {
      headers: getHeaders,
    });

    const messages = await messagesResponse.json();
    const assistantMessages = messages.filter((m: any) => m.role === 'assistant');
    const output = assistantMessages.map((m: any) =>
      m.parts?.map((p: any) => p.text || '').join('\n') || ''
    ).join('\n\n');

    console.log('[Subagent Spawner] Task completed');

    // Keep sandbox alive for potential follow-up calls
    // In production, you'd manage sandbox lifecycle properly

    return {
      sandboxId,
      url,
      token: accessToken || '',
      output: output || 'Task executed successfully',
    };

  } catch (error) {
    console.error('[Subagent Spawner] Error:', error);

    // Cleanup sandbox on error
    try {
      await sandbox.kill();
    } catch (cleanupError) {
      console.error('[Subagent Spawner] Cleanup error:', cleanupError);
    }

    throw error;
  }
}

/**
 * Kill a running sandbox
 */
export async function killSubagent(sandboxId: string): Promise<void> {
  console.log('[Subagent Spawner] Killing sandbox:', sandboxId);
  const sandbox = await Sandbox.connect(sandboxId);
  await sandbox.kill();
  console.log('[Subagent Spawner] Sandbox killed');
}
