import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChatInterface } from '@/components/chat/chat-interface';

export default async function AgentChatByIdPage({
  params,
}: {
  params: Promise<{ id: string; chatId: string }>;
}) {
  const { id: agentId, chatId } = await params;

  return (
    <main className="h-screen w-screen flex flex-col">
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Run Agent</h1>
          <p className="text-sm text-muted-foreground">Agent ID: {agentId}</p>
          <p className="text-xs text-muted-foreground">Chat ID: {chatId}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/agent/${agentId}`}>
            Edit Agent
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatInterface chatId={chatId} />
      </div>
    </main>
  );
}
