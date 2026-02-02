'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpencodeSteps } from '@/components/opencode/opencode-steps';

type AgentRun = {
  id: string;
  task: string;
  toolCallId: string;
};

interface ChatInterfaceProps {
  agentId: string;
}

export function ChatInterface({ agentId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const task = input.trim();
    if (!task) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agent/${agentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to start agent run');
      }

      const data = await response.json();
      if (!data?.toolCallId) {
        throw new Error('Missing toolCallId from server');
      }

      setRuns((prev) => [
        { id: data.toolCallId, task, toolCallId: data.toolCallId },
        ...prev,
      ]);
      setInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Runs */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {runs.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Start a run for your agent
            </div>
          )}

          {runs.map((run, index) => (
            <div key={run.id} className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="text-xs uppercase text-muted-foreground tracking-wide">
                Run {runs.length - index}
              </div>
              <div className="text-sm whitespace-pre-wrap">{run.task}</div>
              <OpencodeSteps toolCallId={run.toolCallId} />
            </div>
          ))}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          Error: {error}
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
