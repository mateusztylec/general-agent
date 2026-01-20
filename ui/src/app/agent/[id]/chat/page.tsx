export default function AgentChatPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="h-screen w-screen p-4">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Chat with Agent</h1>
          <p className="text-muted-foreground">Agent ID: {params.id}</p>
        </div>

        <div className="flex-1 border rounded-lg p-4 bg-card">
          {/* Chat messages will go here */}
          <p className="text-muted-foreground text-center">
            Chat interface coming soon...
          </p>
        </div>

        <div className="mt-4">
          {/* Message input will go here */}
          <input
            type="text"
            placeholder="Type a message..."
            className="w-full p-3 border rounded-lg"
            disabled
          />
        </div>
      </div>
    </main>
  );
}
