'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpencodeSteps } from '@/components/opencode/opencode-steps';
import { useOpencodeStream } from '@/hooks/use-opencode-stream';
import {
  startChatAction,
  closeChatAction,
  pauseChatAction,
  resumeChatAction,
  sendMessageAction,
  resetChatTimeoutAction,
} from '@/app/agent/[id]/chat/actions';

type ChatInterfaceProps = {
  chatId: string;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

function formatCountdown(remainingMs: number) {
  const safeMs = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatStatus, setChatStatus] = useState<'active' | 'paused' | 'closed'>('closed');
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isResettingTimeout, setIsResettingTimeout] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxEndAt, setSandboxEndAt] = useState<string | null>(null);
  const [timerNow, setTimerNow] = useState(() => Date.now());
  const [debugMode, setDebugMode] = useState(false);

  const { toolSteps, responseText, reset } = useOpencodeStream(chatId);

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
      await startChatAction(chatId);
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
      await closeChatAction(chatId);
      setChatStatus('closed');
      setSandboxEndAt(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsClosing(false);
    }
  };

  const handlePause = async () => {
    setIsPausing(true);
    setError(null);

    try {
      await pauseChatAction(chatId);
      setChatStatus('paused');
      setSandboxEndAt(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsPausing(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    setError(null);

    try {
      await resumeChatAction(chatId);
      setChatStatus('active');
      try {
        await fetchSandboxTimeout();
      } catch {
        // timeout fetch is non-critical after resume
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (message.includes('closed')) setChatStatus('closed');
      setError(message);
    } finally {
      setIsResuming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const task = input.trim();
    if (!task || chatStatus !== 'active') return;

    setIsLoading(true);
    setError(null);

    const userMsgId = crypto.randomUUID();

    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: task }]);
    setInput('');
    reset();

    try {
      const data = await sendMessageAction(chatId, task);

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: data.text ?? '' },
      ]);
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
      const data = await resetChatTimeoutAction(chatId);
      if (!data.endAt) throw new Error('Missing sandbox timeout info');

      setSandboxEndAt(String(data.endAt));
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
    router.refresh();
  }, [router]);

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
            onClick={() => setDebugMode((v) => !v)}
            variant={debugMode ? 'secondary' : 'ghost'}
            size="sm"
          >
            Debug
          </Button>
          {chatStatus === 'paused' ? (
            <Button
              type="button"
              onClick={handleResume}
              disabled={isResuming}
              size="sm"
            >
              {isResuming ? 'Resuming...' : 'Resume'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleStart}
              disabled={isStarting || chatStatus === 'active'}
              size="sm"
            >
              {isStarting ? 'Starting...' : 'Start sandbox'}
            </Button>
          )}
          <Button
            type="button"
            onClick={handlePause}
            disabled={isPausing || chatStatus !== 'active'}
            variant="outline"
            size="sm"
          >
            {isPausing ? 'Pausing...' : 'Pause'}
          </Button>
          <Button
            type="button"
            onClick={handleClose}
            disabled={isClosing || chatStatus === 'closed'}
            variant="outline"
            size="sm"
          >
            Close sandbox
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Start sandbox and send your first message
            </div>
          )}

          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2 text-sm text-primary-foreground whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl rounded-bl-md border bg-muted/50 px-4 py-2 text-sm whitespace-pre-wrap">
                  {msg.content || '...'}
                </div>
              </div>
            ),
          )}

          {chatStatus === 'active' && debugMode && (
            <OpencodeSteps toolSteps={toolSteps} responseText={responseText} showDebug={true} />
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm">
          Error: {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
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
