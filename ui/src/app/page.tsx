import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Agents</h1>
            <p className="text-muted-foreground">
              Manage your AI agents
            </p>
          </div>
          <Button>
            Create Agent
          </Button>
        </div>

        <div className="grid gap-4">
          {/* Temporary demo agent */}
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Demo Agent</h3>
            <p className="text-muted-foreground mb-4">
              A demo agent for testing
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/agent/demo-agent-1">
                  Edit
                </Link>
              </Button>
              <Button size="sm" variant="default" asChild>
                <Link href="/agent/demo-agent-1/chat">
                  Chat
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
            <p>No agents yet. Create your first agent to get started.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
