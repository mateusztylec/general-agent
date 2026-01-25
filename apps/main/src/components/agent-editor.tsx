"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type Node,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import "@xyflow/react/dist/style.css";
import { Save } from "lucide-react";
import { toast } from "react-hot-toast";

import { EditorSidebar } from "@/components/editor-sidebar";
import { AgentNode } from "@/components/nodes/agent-node";
import { SubagentNode } from "@/components/nodes/subagent-node";
import { AgentPropertySheet } from "@/components/sheets/agent-property-sheet";
import { SubagentPropertySheet } from "@/components/sheets/subagent-property-sheet";
import { ToolPropertySheet } from "@/components/sheets/tool-property-sheet";
import { SkillPropertySheet } from "@/components/sheets/skill-property-sheet";
import { StoragePropertySheet } from "@/components/sheets/storage-property-sheet";
import { Button } from "@/components/ui/button";
import type {
  AnyBlock,
  BlockType,
  NodeData,
  NodeType,
  SelectedBlock,
  SkillBlock,
  StorageBlock,
  SubagentToolBlock,
  UpdateBlockData,
} from "@/lib/types";
import type {
  AgentConfig,
  OpencodePermissionMap,
  OpencodeToolsMap,
  SubagentConfig,
} from "@general-agent/agent/config-types";
import { SUBAGENT_TOOL_DEFINITIONS } from "@general-agent/agent/config-types";

const nodeTypes = {
  agent: AgentNode,
  subagent: SubagentNode,
};

const defaultNodes: Node<NodeData>[] = [
  {
    id: "agent-1",
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
      llmProvider: "anthropic",
      llmModel: "claude-sonnet-4-5-20250929",
      llmSystemPrompt: "",
    },
  },
];

const defaultEdges: Edge[] = [];

function getNextNodeId(nodes: Node<NodeData>[]) {
  const maxId = nodes.reduce((max, node) => {
    const match = node.id.match(/-(\d+)$/);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  return Math.max(1, maxId + 1);
}

function blocksToTools(blocks: SubagentToolBlock[]): OpencodeToolsMap {
  const tools: OpencodeToolsMap = {} as OpencodeToolsMap;
  for (const block of blocks) {
    // Only add if tool is configured (toolName is not empty)
    if (block.toolName && block.toolName in SUBAGENT_TOOL_DEFINITIONS) {
      tools[block.toolName] = true;
    }
  }
  return tools;
}

function blocksToPermissions(blocks: SubagentToolBlock[]): OpencodePermissionMap {
  const permissions: OpencodePermissionMap = {} as OpencodePermissionMap;
  for (const block of blocks) {
    // Only add if tool is configured (toolName is not empty)
    if (block.toolName && block.toolName in SUBAGENT_TOOL_DEFINITIONS) {
      permissions[block.toolName] = "allow"; // Default to allow
    }
  }
  return permissions;
}

function blocksToSkills(blocks: SkillBlock[]): string[] {
  return blocks.map((block) => block.label);
}

function blocksToStorage(blocks: StorageBlock[]): SubagentConfig["storage"] {
  return blocks.map((block) => ({
    label: block.label,
    description: block.description,
    endpoint: block.endpoint,
    bucketName: block.bucketName,
    accessKey: block.accessKey,
    secretKey: block.secretKey,
    mountPath: block.mountPath,
    accessMode: block.accessMode,
  })) as unknown as SubagentConfig["storage"];
}

function convertToAgentConfig(
  nodes: Node<NodeData>[],
  agentName: string,
): AgentConfig {
  const mainNode = nodes.find((node) => node.type === "agent");
  if (!mainNode) {
    throw new Error("No main agent node found");
  }

  const subagentNodes = nodes.filter((node) => node.type === "subagent");
  const subagents: SubagentConfig[] = subagentNodes.map((node) => ({
    name: node.data.label,
    description: node.data.description,
    llm: {
      provider: node.data.llmProvider || "anthropic",
      model: node.data.llmModel || "claude-sonnet-4-5-20250929",
      systemPrompt: node.data.llmSystemPrompt ?? "",
    },
    tools: blocksToTools(node.data.tools),
    permission: blocksToPermissions(node.data.tools),
    skills: blocksToSkills(node.data.skills),
    storage: blocksToStorage(node.data.storages),
  }));

  return {
    name: agentName,
    mainAgent: {
      llm: {
        provider: mainNode.data.llmProvider || "anthropic",
        model: mainNode.data.llmModel || "claude-sonnet-4-5-20250929",
        systemPrompt:
          mainNode.data.llmSystemPrompt ?? mainNode.data.description ?? "",
      },
    },
    subagents,
  };
}

type EditorFlowProps = {
  agentId: string;
  agentName: string;
  initialNodes: Node<NodeData>[];
  initialEdges: Edge[];
};

function EditorFlow({
  agentId,
  agentName,
  initialNodes,
  initialEdges,
}: EditorFlowProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<NodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sheet state management
  const [openSheet, setOpenSheet] = useState<{
    type: 'agent' | 'subagent' | 'tool' | 'skill' | 'storage';
    nodeId?: string;
    blockId?: string;
  } | null>(null);

  const { screenToFlowPosition } = useReactFlow();
  const nextNodeId = useRef(getNextNodeId(initialNodes));

  useEffect(() => {
    nextNodeId.current = getNextNodeId(initialNodes);
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const config = convertToAgentConfig(nodes, agentName);
      const response = await fetch(`/api/agent/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        let message = `Save failed (${response.status})`;
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) {
            message = payload.error;
          }
        } catch {
          // Ignore JSON parse errors and keep default message
        }
        throw new Error(message);
      }

      toast.success("Saved");
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }, [nodes, agentId, agentName]);

  useEffect(() => {
    const handleBlockDrop = (
      e: CustomEvent<{ nodeId: string; block: AnyBlock }>,
    ) => {
      const { nodeId, block } = e.detail;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            if (block.type === "storage") {
              return {
                ...node,
                data: {
                  ...node.data,
                  storages: [
                    ...(node.data.storages || []),
                    block as StorageBlock,
                  ],
                },
              };
            }
            if (block.type === "tool") {
              return {
                ...node,
                data: {
                  ...node.data,
                  tools: [...(node.data.tools || []), block as SubagentToolBlock],
                },
              };
            }
            if (block.type === "skill") {
              return {
                ...node,
                data: {
                  ...node.data,
                  skills: [...(node.data.skills || []), block as SkillBlock],
                },
              };
            }
          }
          return node;
        }),
      );
    };

    const handleBlockRemove = (
      e: CustomEvent<{ nodeId: string; blockId: string; blockType: BlockType }>,
    ) => {
      const { nodeId, blockId, blockType } = e.detail;
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            if (blockType === "storage") {
              return {
                ...node,
                data: {
                  ...node.data,
                  storages: (node.data.storages || []).filter(
                    (s: StorageBlock) => s.id !== blockId,
                  ),
                },
              };
            }
            const key = blockType === "tool" ? "tools" : "skills";
            return {
              ...node,
              data: {
                ...node.data,
                [key]: (node.data[key] || []).filter(
                  (b: AnyBlock) => b.id !== blockId,
                ),
              },
            };
          }
          return node;
        }),
      );
      setSelectedBlock((prev) => (prev?.block.id === blockId ? null : prev));
    };

    const handleBlockSelect = (
      e: CustomEvent<{ nodeId: string; block: AnyBlock }>,
    ) => {
      const { nodeId, block } = e.detail;
      setSelectedBlock({ nodeId, block });
      setSelectedNode(null);

      // Open appropriate sheet based on block type
      if (block.type === 'tool') {
        setOpenSheet({ type: 'tool', nodeId, blockId: block.id });
      } else if (block.type === 'skill') {
        setOpenSheet({ type: 'skill', nodeId, blockId: block.id });
      } else if (block.type === 'storage') {
        setOpenSheet({ type: 'storage', nodeId, blockId: block.id });
      }
    };

    window.addEventListener("block-drop", handleBlockDrop as EventListener);
    window.addEventListener("block-remove", handleBlockRemove as EventListener);
    window.addEventListener("block-select", handleBlockSelect as EventListener);

    return () => {
      window.removeEventListener(
        "block-drop",
        handleBlockDrop as EventListener,
      );
      window.removeEventListener(
        "block-remove",
        handleBlockRemove as EventListener,
      );
      window.removeEventListener(
        "block-select",
        handleBlockSelect as EventListener,
      );
    };
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) return;

      if (sourceNode.type !== "agent" || targetNode.type !== "subagent") {
        return;
      }

      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "var(--primary)", strokeWidth: 2 },
          },
          eds,
        ),
      );
    },
    [nodes, setEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      setSelectedNode(node);
      setSelectedBlock(null);

      // Open appropriate sheet based on node type
      if (node.type === 'agent') {
        setOpenSheet({ type: 'agent', nodeId: node.id });
      } else if (node.type === 'subagent') {
        setOpenSheet({ type: 'subagent', nodeId: node.id });
      }
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedBlock(null);
    setOpenSheet(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        "application/reactflow",
      ) as NodeType;

      if (!type || (type !== "agent" && type !== "subagent")) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const labels: Record<NodeType, string> = {
        agent: "Main Agent",
        subagent: "Subagent",
      };

      const descriptions: Record<NodeType, string> = {
        agent: "Primary AI agent",
        subagent: "Delegated agent",
      };

      const newNode: Node<NodeData> = {
        id: `${type}-${nextNodeId.current++}`,
        type,
        position,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: labels[type],
          description: descriptions[type],
          tools: [],
          skills: [],
          storages: [],
          llmProvider: "anthropic",
          llmModel: "claude-sonnet-4-5-20250929",
          llmSystemPrompt: "",
        },
      };

      setNodes((nds) => [...nds, newNode]);

      // Auto-connect subagent to main agent
      if (type === "subagent") {
        const mainAgent = nodes.find((n) => n.type === "agent");
        if (mainAgent) {
          setEdges((eds) =>
            addEdge(
              {
                id: `edge-${mainAgent.id}-${newNode.id}`,
                source: mainAgent.id,
                target: newNode.id,
                animated: true,
                style: { stroke: "var(--primary)", strokeWidth: 2 },
              },
              eds,
            ),
          );
        }
      }
    },
    [screenToFlowPosition, setNodes, setEdges, nodes],
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<NodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, ...data } };
          }
          return node;
        }),
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId
          ? { ...prev, data: { ...prev.data, ...data } }
          : prev,
      );
    },
    [setNodes],
  );

  const updateBlockData = useCallback(
    (nodeId: string, blockId: string, data: UpdateBlockData) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                tools: node.data.tools.map((b: SubagentToolBlock) =>
                  b.id === blockId ? { ...b, ...data } : b,
                ),
                skills: node.data.skills.map((b: SkillBlock) =>
                  b.id === blockId ? { ...b, ...data } : b,
                ),
                storages: node.data.storages.map((s: StorageBlock) =>
                  s.id === blockId ? { ...s, ...data } : s,
                ),
              },
            };
          }
          return node;
        }),
      );
      setSelectedBlock((prev) =>
        prev?.block.id === blockId
          ? { ...prev, block: { ...prev.block, ...data } }
          : prev,
      );
    },
    [setNodes],
  );

  const deleteBlock = useCallback(
    (nodeId: string, blockId: string, blockType?: BlockType) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            // If no blockType provided, try to find it
            const type = blockType ||
              (node.data.storages.find(s => s.id === blockId) ? 'storage' :
                node.data.tools.find(t => t.id === blockId) ? 'tool' : 'skill');

            if (type === "storage") {
              return {
                ...node,
                data: {
                  ...node.data,
                  storages: (node.data.storages || []).filter(
                    (s: StorageBlock) => s.id !== blockId,
                  ),
                },
              };
            }
            if (type === "tool") {
              return {
                ...node,
                data: {
                  ...node.data,
                  tools: (node.data.tools || []).filter(
                    (b: SubagentToolBlock) => b.id !== blockId,
                  ),
                },
              };
            }
            if (type === "skill") {
              return {
                ...node,
                data: {
                  ...node.data,
                  skills: (node.data.skills || []).filter(
                    (b: SkillBlock) => b.id !== blockId,
                  ),
                },
              };
            }
          }
          return node;
        }),
      );
      setSelectedBlock(null);
      setOpenSheet(null);
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
      );
      setSelectedNode(null);
      setOpenSheet(null);
    },
    [setNodes, setEdges],
  );

  // Helper to get current node/block for sheets
  const getCurrentNode = () => {
    if (!openSheet?.nodeId) return null;
    return nodes.find(n => n.id === openSheet.nodeId) || null;
  };

  const getCurrentBlock = (): AnyBlock | null => {
    if (!openSheet?.nodeId || !openSheet?.blockId) return null;
    const node = nodes.find(n => n.id === openSheet.nodeId);
    if (!node) return null;

    // Search in tools, skills, and storages
    const allBlocks: AnyBlock[] = [
      ...node.data.tools,
      ...node.data.skills,
      ...node.data.storages,
    ];
    return allBlocks.find(b => b.id === openSheet.blockId) || null;
  };

  return (
    <div className="flex h-full w-full">
      <EditorSidebar />
      <div ref={reactFlowWrapper} className="flex-1 h-full relative">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="shadow-lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
        <ReactFlow<Node<NodeData>, Edge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          className="bg-background"
        >
          <Controls className="bg-card! border-border!" />
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="var(--border)"
          />
        </ReactFlow>
      </div>

      {/* Property Sheets */}
      <AgentPropertySheet
        node={openSheet?.type === 'agent' ? getCurrentNode() : null}
        isOpen={Boolean(openSheet?.type === 'agent')}
        onClose={() => setOpenSheet(null)}
        onUpdate={updateNodeData}
      />

      <SubagentPropertySheet
        node={openSheet?.type === 'subagent' ? getCurrentNode() : null}
        isOpen={Boolean(openSheet?.type === 'subagent')}
        onClose={() => setOpenSheet(null)}
        onUpdate={updateNodeData}
      />

      <ToolPropertySheet
        nodeId={openSheet?.type === 'tool' ? openSheet.nodeId || null : null}
        block={openSheet?.type === 'tool' ? getCurrentBlock() as SubagentToolBlock | null : null}
        node={openSheet?.type === 'tool' ? getCurrentNode() : null}
        isOpen={Boolean(openSheet?.type === 'tool')}
        onClose={() => setOpenSheet(null)}
        onUpdate={updateBlockData}
        onDelete={deleteBlock}
      />

      <SkillPropertySheet
        nodeId={openSheet?.type === 'skill' ? openSheet.nodeId || null : null}
        block={openSheet?.type === 'skill' ? getCurrentBlock() as SkillBlock | null : null}
        isOpen={Boolean(openSheet?.type === 'skill')}
        onClose={() => setOpenSheet(null)}
        onUpdate={updateBlockData}
        onDelete={deleteBlock}
      />

      <StoragePropertySheet
        nodeId={openSheet?.type === 'storage' ? openSheet.nodeId || null : null}
        block={openSheet?.type === 'storage' ? getCurrentBlock() as StorageBlock | null : null}
        isOpen={Boolean(openSheet?.type === 'storage')}
        onClose={() => setOpenSheet(null)}
        onUpdate={updateBlockData}
        onDelete={deleteBlock}
      />
    </div>
  );
}

type AgentEditorProps = {
  agentId: string;
  agentName: string;
  initialNodes?: Node<NodeData>[];
  initialEdges?: Edge[];
};

export function AgentEditor({
  agentId,
  agentName,
  initialNodes = defaultNodes,
  initialEdges = defaultEdges,
}: AgentEditorProps) {
  return (
    <ReactFlowProvider>
      <EditorFlow
        key={agentId}
        agentId={agentId}
        agentName={agentName}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
      />
    </ReactFlowProvider>
  );
}
