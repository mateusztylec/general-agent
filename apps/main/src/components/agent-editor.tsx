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

import { EditorSidebar } from "@/components/editor-sidebar";
import { AgentNode } from "@/components/nodes/agent-node";
import { SubagentNode } from "@/components/nodes/subagent-node";
import { Button } from "@/components/ui/button";
import type {
  Block,
  BlockType,
  NodeData,
  NodeType,
  SelectedBlock,
  StorageBlock,
  UpdateBlockData,
} from "@/lib/types";
import type {
  AgentConfig,
  OpencodeToolsMap,
  SubagentConfig,
} from "@general-agent/agent/config-types";

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

function blocksToTools(blocks: Block[]): OpencodeToolsMap {
  const tools: OpencodeToolsMap = {} as OpencodeToolsMap;
  for (const block of blocks) {
    tools[block.label as keyof OpencodeToolsMap] = true;
  }
  return tools;
}

function blocksToSkills(blocks: Block[]): string[] {
  return blocks.map((block) => block.label);
}

function blocksToStorage(blocks: StorageBlock[]): unknown[] {
  return blocks.map((block) => ({
    label: block.label,
    description: block.description,
    endpoint: block.endpoint,
    bucketName: block.bucketName,
    accessKey: block.accessKey,
    secretKey: block.secretKey,
    mountPath: block.mountPath,
    accessMode: block.accessMode,
  }));
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
    systemPrompt: node.data.description,
    description: node.data.description,
    tools: blocksToTools(node.data.tools),
    skills: blocksToSkills(node.data.skills),
    storage: blocksToStorage(node.data.storages),
  }));

  return {
    name: agentName,
    mainAgent: {
      systemPrompt: mainNode.data.description,
      model: "claude-sonnet-4-5-20250929",
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
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
    setSaveStatus("idle");
    try {
      const config = convertToAgentConfig(nodes, agentName);
      const response = await fetch(`/api/agent/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, agentId, agentName]);

  useEffect(() => {
    const handleBlockDrop = (
      e: CustomEvent<{ nodeId: string; block: Block | StorageBlock }>,
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
            const key = block.type === "tool" ? "tools" : "skills";
            return {
              ...node,
              data: {
                ...node.data,
                [key]: [...(node.data[key] || []), block],
              },
            };
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
                  (b: Block) => b.id !== blockId,
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
      e: CustomEvent<{ nodeId: string; block: Block | StorageBlock }>,
    ) => {
      const { nodeId, block } = e.detail;
      setSelectedBlock({ nodeId, block });
      setSelectedNode(null);
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
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedBlock(null);
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
                tools: node.data.tools.map((b: Block) =>
                  b.id === blockId ? { ...b, ...data } : b,
                ),
                skills: node.data.skills.map((b: Block) =>
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
    (nodeId: string, blockId: string, blockType: BlockType) => {
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
                  (b: Block) => b.id !== blockId,
                ),
              },
            };
          }
          return node;
        }),
      );
      setSelectedBlock(null);
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
    },
    [setNodes, setEdges],
  );

  return (
    <div className="flex h-full w-full">
      <EditorSidebar
        selectedNode={selectedNode}
        selectedBlock={selectedBlock}
        onUpdateNode={updateNodeData}
        onUpdateBlock={updateBlockData}
        onDeleteNode={deleteNode}
        onDeleteBlock={deleteBlock}
      />
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
          {saveStatus === "success" && (
            <div className="text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-md shadow-sm">
              Saved!
            </div>
          )}
          {saveStatus === "error" && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md shadow-sm">
              Save failed
            </div>
          )}
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
