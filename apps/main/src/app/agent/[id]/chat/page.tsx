import { ChatBootstrapper } from '@/components/chat/chat-bootstrapper';

export default async function AgentChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatBootstrapper agentId={id} />;
}
