'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpencodeSteps } from '@/components/opencode/opencode-steps';

type ChatInterfaceProps = {
  chatId: string;
};

type ChatTurn = {
  id: string;
  user: string;
  assistant: string;
};

function formatCountdown(remainingMs: number) {
  const safeMs = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [chatStatus, setChatStatus] = useState<'active' | 'closed'>('closed');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isResettingTimeout, setIsResettingTimeout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxEndAt, setSandboxEndAt] = useState<string | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());

  const remainingMs = useMemo(() => {
    if (!sandboxEndAt) return null;
    return Math.max(0, new Date(sandboxEndAt).getTime() - timerNow);
  }, [sandboxEndAt, timerNow]);

  const countdownLabel = useMemo(() => {
    if (remainingMs === null) return '--:--';
    return formatCountdown(remainingMs);
  }, [remainingMs]);

  const fetchSandboxTimeout = async () => {
    const response = await fetch(`/api/chat/${chatId}/timeout`, {
      method: 'GET',
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || 'Failed to get sandbox timeout');
    }

    const data = (await response.json()) as { endAt?: string };
    if (!data.endAt) {
      throw new Error('Missing sandbox timeout info');
    }

    setSandboxEndAt(data.endAt);
    setTimerNow(Date.now());
  };

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
      try {
        await fetchSandboxTimeout();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('Start sandbox')) {
          setChatStatus('closed');
          setSandboxEndAt(null);
        }
        setError(message);
      }
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
      setSandboxEndAt(null);
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

      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          user: task,
          assistant: '',
        },
      ]);
      setInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('Start sandbox')) {
        setChatStatus('closed');
        setSandboxEndAt(null);
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetTimeout = async () => {
    setIsResettingTimeout(true);
    setError(null);

    try {
      const response = await fetch(`/api/chat/${chatId}/timeout`, {
        method: 'POST',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to reset sandbox timeout');
      }

      const data = (await response.json()) as { endAt?: string };
      if (!data.endAt) {
        throw new Error('Missing sandbox timeout info');
      }

      setSandboxEndAt(data.endAt);
      setTimerNow(Date.now());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('Start sandbox')) {
        setChatStatus('closed');
        setSandboxEndAt(null);
      }
      setError(message);
    } finally {
      setIsResettingTimeout(false);
    }
  };

  useEffect(() => {
    if (chatStatus !== 'active' || !sandboxEndAt) return;

    setTimerNow(Date.now());
    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [chatStatus, sandboxEndAt]);

  useEffect(() => {
    if (chatStatus !== 'active') return;
    if (remainingMs !== 0) return;

    setChatStatus('closed');
    setSandboxEndAt(null);
    setError('Sandbox timed out. Start sandbox again.');
  }, [chatStatus, remainingMs]);

  const handleAssistantText = (text: string) => {
    setTurns((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = next[next.length - 1];
      next[next.length - 1] = {
        ...last,
        assistant: text,
      };
      return next;
    });
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
            onClick={handleResetTimeout}
            disabled={chatStatus !== 'active' || isResettingTimeout}
            variant="outline"
            size="sm"
            title="Reset sandbox timeout to 3:00"
          >
            {countdownLabel}
          </Button>
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
        <div className="space-y-4">
          {turns.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Start sandbox and send your first message
            </div>
          )}

          {turns.map((turn) => (
            <div key={turn.id} className="space-y-2">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
                  {turn.user}
                </div>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md border bg-muted/50 px-4 py-2 text-sm whitespace-pre-wrap">
                  {turn.assistant || '...'}
                </div>
              </div>
            </div>
          ))}

          {chatStatus === 'active' && (
            <OpencodeSteps
              chatId={chatId}
              onLatestResponseText={handleAssistantText}
              showDebug={true}
            />
          )}
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
