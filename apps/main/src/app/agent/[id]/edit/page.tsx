import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@general-agent/database/client";
import { getAgentById } from "@general-agent/database/queries/agents";
import { getSkillsByIds } from "@general-agent/database/queries/skills";
import { auth } from "@/lib/auth";
import { parseAgentConfig } from "@general-agent/agent/config-types";
import { AgentEditorClient } from "@/components/agent/agent-editor-client";

export default async function AgentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const { id } = await params;
  const agent = await getAgentById(db, id);

  if (!agent || agent.userId !== session.user.id) {
    notFound();
  }

  let config;
  try {
    config = parseAgentConfig(agent.config);
  } catch (error) {
    console.error("Invalid agent config", error);
    config = {
      llm: {
        provider: "anthropic" as const,
        model: "anthropic/claude-sonnet-4-5-20250929",
        systemPrompt: "",
        credentialId: "", // Required - empty will show validation error in UI
      },
      tools: {},
      sandbox: {},
    };
  }

  // Get custom skills from agent config
  const customSkillIds = config.skills?.custom || [];
  const skills = await getSkillsByIds(customSkillIds);

  return (
    <AgentEditorClient
      agentId={id}
      agentName={agent.name}
      initialConfig={config}
      initialSkills={skills}
    />
  );
}
