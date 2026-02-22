'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createChatAction } from '@/app/agent/[id]/chat/actions';

interface ChatBootstrapperProps {
  agentId: string;
}

export function ChatBootstrapper({ agentId }: ChatBootstrapperProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const data = await createChatAction(agentId);
        if (!data?.chatId) throw new Error('Missing chatId in response');
        if (!cancelled) {
          router.replace(`/agent/${agentId}/chat/${data.chatId}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (!cancelled) setError(message);
      }
    };

    void run();
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
