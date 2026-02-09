'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChatBootstrapperProps {
  agentId: string;
}

export function ChatBootstrapper({ agentId }: ChatBootstrapperProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const createChat = async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || 'Failed to create chat');
        }

        const data = await response.json();
        if (!data?.chatId) {
          throw new Error('Missing chatId in response');
        }

        if (!cancelled) {
          router.replace(`/agent/${agentId}/chat/${data.chatId}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (!cancelled) {
          setError(message);
        }
      }
    };

    void createChat();
    return () => {
      cancelled = true;
    };
  }, [agentId, router]);

  return (
    <main className="h-screen w-screen flex items-center justify-center">
      <div className="text-sm text-muted-foreground">
        {error ? `Failed to create chat: ${error}` : 'Creating chat...'}
      </div>
    </main>
  );
}
