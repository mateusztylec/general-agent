import ConversationClient from "@/app/components/conversation-client";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <ConversationClient sessionId={sessionId} />
      </main>
    </div>
  );
}


