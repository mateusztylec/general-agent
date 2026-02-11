import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { UserMenu } from "@/components/user-menu";
import { CreateAgentDialog } from "@/components/agent/create-agent-dialog";
import { db } from "@general-agent/database/client";
import { getAgentsByUserId } from "@general-agent/database/queries/agents";

export default async function Home() {
  // Session is guaranteed by proxy.ts middleware
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // This should never happen due to proxy, but TypeScript doesn't know that
  if (!session) {
    throw new Error("Unauthorized");
  }

  const agents = await getAgentsByUserId(db, session.user.id);

  type Agent = typeof agents[number];

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
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/skills">
                Skills
              </Link>
            </Button>
            <UserMenu userName={session.user.name || session.user.email} />
            <CreateAgentDialog />
          </div>
        </div>

        <div className="grid gap-4">
          {agents.length === 0 ? (
            <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
              <p>No agents yet. Create your first agent to get started.</p>
            </div>
          ) : (
            agents.map((agent: Agent) => (
              <div key={agent.id} className="p-6 border rounded-lg">
                <h3 className="text-xl font-semibold mb-2">{agent.name}</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Created {agent.createdAt.toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/agent/${agent.id}`}>
                      Edit
                    </Link>
                  </Button>
                  <Button size="sm" variant="default" asChild>
                    <Link href={`/agent/${agent.id}/chat`}>
                      Chat
                    </Link>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
