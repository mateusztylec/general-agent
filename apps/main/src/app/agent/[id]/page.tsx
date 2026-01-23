import { AgentEditor } from "@/components/agent-editor";

export default function AgentEditorPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <AgentEditor />
    </main>
  );
}
