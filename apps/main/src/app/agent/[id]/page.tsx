import { AgentEditor } from "@/components/agent-editor";
import type { Edge, Node } from "@xyflow/react";
import { Position } from "@xyflow/react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@general-agent/database/client";
import { getAgentById } from "@general-agent/database/queries/agents";
import { parseAgentConfig } from "@general-agent/agent/config-types";
import type { AgentConfig, OpencodeToolsMap } from "@general-agent/agent/config-types";
import type {
  NodeData,
  SkillBlock,
  StorageBlock,
  SubagentToolBlock,
} from "@/lib/types";
import { auth } from "@/lib/auth";

const MAIN_NODE_ID = "agent-1";

function toolsToBlocks(tools?: OpencodeToolsMap): SubagentToolBlock[] {
  if (!tools) return [];
  return Object.entries(tools)
    .filter(([, enabled]) => enabled)
    .map(([toolName]) => ({
      id: `tool-${toolName}`,
      type: "tool",
      toolName: toolName as SubagentToolBlock["toolName"],
    }));
}

function skillsToBlocks(skills?: string[]): SkillBlock[] {
  if (!skills) return [];
  return skills.map((skill, index) => ({
    id: `skill-${index + 1}`,
    type: "skill",
    label: skill,
    description: "Configured skill",
  }));
}

function storageToBlocks(storage?: unknown[]): StorageBlock[] {
  if (!storage) return [];
  return storage
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      if (
        typeof record.label !== "string" ||
        typeof record.description !== "string" ||
        typeof record.endpoint !== "string" ||
        typeof record.bucketName !== "string" ||
        typeof record.accessKey !== "string" ||
        typeof record.secretKey !== "string" ||
        typeof record.mountPath !== "string" ||
        (record.accessMode !== "readonly" && record.accessMode !== "full")
      ) {
        return null;
      }
      return {
        id: `storage-${index + 1}`,
        type: "storage",
        label: record.label,
        description: record.description,
        endpoint: record.endpoint,
        bucketName: record.bucketName,
        accessKey: record.accessKey,
        secretKey: record.secretKey,
        mountPath: record.mountPath,
        accessMode: record.accessMode,
      } satisfies StorageBlock;
    })
    .filter((entry): entry is StorageBlock => Boolean(entry));
}

function buildEditorState(config: AgentConfig): {
  nodes: Node<NodeData>[];
  edges: Edge[];
} {
  const mainNode: Node<NodeData> = {
    id: MAIN_NODE_ID,
    type: "agent",
    position: { x: 400, y: 100 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: {
      label: "Main Agent",
      description: "Primary AI agent",
      tools: [],
      skills: [],
      storages: [],
      llmProvider: config.mainAgent.llm.provider,
      llmModel: config.mainAgent.llm.model,
      llmSystemPrompt: config.mainAgent.llm.systemPrompt,
    },
  };

  const subagentNodes = config.subagents.map((subagent, index) => ({
    id: `subagent-${index + 1}`,
    type: "subagent",
    position: { x: 200 + index * 300, y: 350 },
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    data: {
      label: subagent.name,
      description: subagent.description,
      tools: toolsToBlocks(subagent.tools),
      skills: skillsToBlocks(subagent.skills),
      storages: storageToBlocks(subagent.storage),
      sandbox: {
        internetAccess: subagent.sandbox?.internetAccess ?? false,
      },
      llmProvider: subagent.llm?.provider ?? config.mainAgent.llm.provider,
      llmModel: subagent.llm?.model ?? config.mainAgent.llm.model,
      llmSystemPrompt: subagent.llm?.systemPrompt ?? "",
    },
  })) satisfies Node<NodeData>[];

  const edges = subagentNodes.map((node) => ({
    id: `edge-${MAIN_NODE_ID}-${node.id}`,
    source: MAIN_NODE_ID,
    target: node.id,
    animated: true,
    style: { stroke: "var(--primary)", strokeWidth: 2 },
  })) satisfies Edge[];

  return {
    nodes: [mainNode, ...subagentNodes],
    edges,
  };
}

export default async function AgentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const { id } = await params;
  const agent = await getAgentById(db, id);
  if (!agent || agent.userId !== session.user.id) {
    notFound();
  }

  let config: AgentConfig;
  try {
    config = parseAgentConfig(agent.config);
  } catch (error) {
    console.error("Invalid agent config", error);
    return (
      <main className="h-screen w-screen overflow-hidden flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Invalid agent config. Fix the JSON and refresh.
        </div>
      </main>
    );
  }

  const { nodes, edges } = buildEditorState(config);
  return (
    <main className="h-screen w-screen overflow-hidden">
      <AgentEditor
        agentId={id}
        agentName={agent.name}
        initialNodes={nodes}
        initialEdges={edges}
      />
    </main>
  );
}
