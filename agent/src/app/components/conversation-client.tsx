"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AgentChat from "@/app/components/agent-chat";
import { useAgentUi } from "@/app/components/agent-ui-provider";

export default function ConversationClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { addDebugEvent } = useAgentUi();

  const isNew = sessionId === "new";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-black dark:hover:bg-zinc-900"
            >
              Back
            </Link>
            <h1 className="text-xl font-semibold tracking-tight">{isNew ? "New conversation" : "Conversation"}</h1>
          </div>
          <Link
            href="/inspector"
            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-black dark:hover:bg-zinc-900"
          >
            Inspector
          </Link>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          <span className="text-zinc-500">Session:</span>{" "}
          <code className="font-mono">{isNew ? "(pending…)" : sessionId}</code>
        </div>
      </header>

      <AgentChat
        initialSessionId={isNew ? "" : sessionId}
        onSessionResolved={(realId) => {
          addDebugEvent({ kind: "info", label: "Route", detail: `Resolved session => ${realId}`, scope: realId });
          router.replace(`/c/${encodeURIComponent(realId)}`);
        }}
      />
    </div>
  );
}


