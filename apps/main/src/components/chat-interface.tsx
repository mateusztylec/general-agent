'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DefaultChatTransport } from 'ai';
import { OpencodeSteps } from '@/components/opencode-steps';

type ToolResultPayload = {
  jobId?: string;
  output?: string;
};

function getToolResultPayload(part: unknown): ToolResultPayload | null {
  if (!part || typeof part !== 'object') return null;
  const record = part as Record<string, unknown>;
  const raw =
    'result' in record
      ? record.result
      : 'output' in record
        ? record.output
        : undefined;

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ToolResultPayload;
    } catch {
      return { output: raw };
    }
  }

  if (raw && typeof raw === 'object') {
    return raw as ToolResultPayload;
  }

  return null;
}

interface ChatInterfaceProps {
  agentId: string;
}

export function ChatInterface({ agentId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/agent/${agentId}/chat`,
    }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const isLoading = status === 'streaming' || status === 'submitted';

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Start a conversation with your agent
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {message.role === 'user' ? 'You' : 'Agent'}
                </div>
                <div className="whitespace-pre-wrap">
                  {message.parts?.map((part, idx) => {
                    if (part.type === 'text') {
                      return <div key={idx}>{part.text}</div>;
                    }
                    if (part.type === 'tool-call') {
                      const toolCallId =
                        'toolCallId' in part ? String(part.toolCallId) : undefined;
                      return (
                        <div key={idx} className="mt-2 space-y-2">
                          <div className="text-xs opacity-75">
                            🔧 {part.title}...
                          </div>
                          {toolCallId && <OpencodeSteps jobId={toolCallId} />}
                        </div>
                      );
                    }
                    if (part.type.startsWith('tool-')) {
                      const result = getToolResultPayload(part);
                      if (!result) return null;
                      return (
                        <div key={idx} className="mt-2 space-y-2">
                          {result.output && (
                            <div className="text-sm">{result.output}</div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse">●</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          Error: {error.message}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
