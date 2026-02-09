'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpencodeSteps } from '@/components/opencode/opencode-steps';

interface ChatInterfaceProps {
  chatId: string;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [chatStatus, setChatStatus] = useState<'active' | 'closed'>('closed');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${chatId}/start`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to start sandbox');
      }
      setChatStatus('active');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleClose = async () => {
    setIsClosing(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${chatId}/close`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to close sandbox');
      }
      setChatStatus('closed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsClosing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const task = input.trim();
    if (!task || chatStatus !== 'active') return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${chatId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to send message');
      }

      setMessages((prev) => [task, ...prev]);
      setInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('Start sandbox')) {
        setChatStatus('closed');
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 flex items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Status: <span className="font-medium">{chatStatus}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleStart}
            disabled={isStarting || chatStatus === 'active'}
            size="sm"
          >
            Start sandbox
          </Button>
          <Button
            type="button"
            onClick={handleClose}
            disabled={isClosing || chatStatus !== 'active'}
            variant="outline"
            size="sm"
          >
            Close sandbox
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Start sandbox and send your first message
            </div>
          )}

          {messages.map((message, index) => (
            <div key={`${message}-${index}`} className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="text-xs uppercase text-muted-foreground tracking-wide">
                Message {messages.length - index}
              </div>
              <div className="text-sm whitespace-pre-wrap">{message}</div>
            </div>
          ))}

          {chatStatus === 'active' && <OpencodeSteps chatId={chatId} />}
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
            disabled={isLoading || chatStatus !== 'active'}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || chatStatus !== 'active' || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}
