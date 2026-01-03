import { query, tool, createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { sandboxClient } from './sandbox-client';

/**
 * Create custom MCP tools that execute in the Cloudflare Sandbox
 */
const sandboxTools = createSdkMcpServer({
  name: 'sandbox',
  version: '1.0.0',
  tools: [
    // Execute shell commands in sandbox
    tool(
      'exec',
      'Execute a shell command in the remote sandbox environment. Use this for running any terminal commands.',
      {
        command: z.string().describe('The shell command to execute'),
      },
      async (args) => {
        const result = await sandboxClient.exec(args.command);

        let output = '';
        if (result.stdout) output += result.stdout;
        if (result.stderr) output += (output ? '\n' : '') + result.stderr;

        if (!output) {
          output = result.success
            ? '(Command completed successfully with no output)'
            : `(Command failed with exit code ${result.exitCode})`;
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      }
    ),

    // Read file from sandbox
    tool(
      'read_file',
      'Read the contents of a file from the sandbox environment',
      {
        path: z.string().describe('The absolute path to the file'),
      },
      async (args) => {
        const result = await sandboxClient.readFile(args.path);

        if (result.error) {
          return {
            content: [{ type: 'text', text: `Error: ${result.error}` }],
          };
        }

        return {
          content: [{ type: 'text', text: result.content }],
        };
      }
    ),

    // Write file to sandbox
    tool(
      'write_file',
      'Write content to a file in the sandbox environment',
      {
        path: z.string().describe('The absolute path to the file'),
        content: z.string().describe('The content to write to the file'),
      },
      async (args) => {
        const result = await sandboxClient.writeFile(args.path, args.content);

        if (result.error) {
          return {
            content: [{ type: 'text', text: `Error: ${result.error}` }],
          };
        }

        return {
          content: [{ type: 'text', text: `Successfully wrote to ${args.path}` }],
        };
      }
    ),
  ],
});

interface SSEStream {
  writeSSE(event: { data: string; event?: string; id?: string }): Promise<void>;
}

export async function handleChat(
  userMessage: string,
  stream: SSEStream,
  options?: { sessionId?: string }
): Promise<void> {
  try {
    console.log('[agent] query start', { resume: options?.sessionId ?? null });
    // Use the Claude Agent SDK query function
    for await (const message of query({
      prompt: userMessage,
      options: {
        // IMPORTANT:
        // - `allowedTools` controls which tools are auto-approved (permissions), not which tools exist.
        // - To restrict available built-in tools (like Bash/Read/Edit), set `tools: []`.
        tools: [],
        // Use our custom sandbox tools
        mcpServers: {
          sandbox: sandboxTools,
        },
        // Allow only our sandbox tools
        allowedTools: [
          'mcp__sandbox__exec',
          'mcp__sandbox__read_file',
          'mcp__sandbox__write_file',
        ],
        ...(options?.sessionId ? { resume: options.sessionId } : {}),
        // Accept tool calls without manual approval
        permissionMode: 'acceptEdits',
      },
    })) {
      // Handle different message types
      if ('type' in message) {
        switch (message.type) {
          case 'system': {
            // Capture session_id so the client can resume later.
            if (message.subtype === 'init') {
              console.log('[agent] session init', { sessionId: message.session_id });
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'session',
                  sessionId: message.session_id,
                }),
              });
            }
            break;
          }

          case 'user': {
            // Tool results are surfaced as 'user' messages responding to a tool_use_id
            if (message.tool_use_result !== undefined && message.parent_tool_use_id) {
              const raw = message.tool_use_result;
              const result =
                typeof raw === 'string' ? raw.substring(0, 500) : JSON.stringify(raw).substring(0, 500);

              console.log('[agent] tool result', {
                tool_use_id: message.parent_tool_use_id,
                resultPreview: result,
              });

              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'tool_result',
                  tool_use_id: message.parent_tool_use_id,
                  result,
                }),
              });
            }
            break;
          }

          case 'assistant':
            // Stream assistant text to client
            if (message.message?.content) {
              for (const block of message.message.content) {
                if (block.type === 'text') {
                  await stream.writeSSE({
                    data: JSON.stringify({ type: 'text', content: block.text }),
                  });
                } else if (block.type === 'tool_use') {
                  console.log('[agent] tool start', {
                    tool_use_id: block.id,
                    name: block.name,
                    input: block.input,
                  });
                  await stream.writeSSE({
                    data: JSON.stringify({
                      type: 'tool_start',
                      tool_use_id: block.id,
                      name: block.name,
                      input: block.input,
                    }),
                  });
                }
              }
            }
            break;

          case 'result':
            // Final result
            if (message.subtype === 'success') {
              console.log('[agent] done', { cost: message.total_cost_usd });
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'done',
                  result: message.result,
                  cost: message.total_cost_usd,
                }),
              });
            } else {
              console.error('[agent] execution error', {
                cost: message.total_cost_usd,
                errors: message.errors,
              });
              await stream.writeSSE({
                data: JSON.stringify({
                  type: 'error',
                  error: message.errors?.join('\n') || 'Unknown error',
                  cost: message.total_cost_usd,
                }),
              });
            }
            break;
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await stream.writeSSE({
      data: JSON.stringify({ type: 'error', error: errorMessage }),
    });
  }
}
