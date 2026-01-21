import { ChatInterface } from "@/components/chat-interface";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AgentChatPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="h-screen w-screen flex flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Chat with Agent</h1>
          <p className="text-sm text-muted-foreground">ID: {params.id}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/agent/${params.id}`}>
            Edit Agent
          </Link>
        </Button>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface agentId={params.id} />
      </div>
    </main>
  );
}
