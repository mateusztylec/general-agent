"use client";

import Link from "next/link";
import { useAgentUi } from "@/app/components/agent-ui-provider";
import { useMemo, useState } from "react";

export default function HomeClient() {
  const { conversations, renameConversation, deleteConversation, clearConversations } = useAgentUi();
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q) || c.sessionId.toLowerCase().includes(q));
  }, [conversations, filter]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/c/new"
              className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              New
            </Link>
            <Link
              href="/inspector"
              className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-black dark:hover:bg-zinc-900"
            >
              Inspector
            </Link>
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Stored locally (no server persistence). Open a conversation to continue.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by title or sessionId…"
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-black sm:max-w-md"
          />
          <button
            type="button"
            onClick={() => {
              if (confirm("Clear all local conversations?")) clearConversations();
            }}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-black dark:hover:bg-zinc-900"
          >
            Clear all
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {filtered.length === 0 ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">No conversations yet.</div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((c) => (
              <div key={c.sessionId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/c/${encodeURIComponent(c.sessionId)}`} className="font-medium hover:underline">
                    {c.title}
                  </Link>
                  <div className="mt-1 truncate font-mono text-xs text-zinc-500">{c.sessionId}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const title = prompt("Rename conversation", c.title);
                      if (title !== null) renameConversation(c.sessionId, title);
                    }}
                    className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-black dark:hover:bg-zinc-900"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this conversation from local list?")) deleteConversation(c.sessionId);
                    }}
                    className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-black dark:hover:bg-zinc-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


