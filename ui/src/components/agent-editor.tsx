"use client";

import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  type Node,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import "@xyflow/react/dist/style.css";

import { EditorSidebar } from "@/components/editor-sidebar";
import { AgentNode } from "@/components/nodes/agent-node";
import { SubagentNode } from "@/components/nodes/subagent-node";
import type {
  Block,
  BlockType,
  NodeData,
  NodeType,
  SelectedBlock,
  StorageBlock,
  UpdateBlockData,
} from "@/lib/types";

const nodeTypes = {
  agent: AgentNode,
  subagent: SubagentNode,
};

const initialNodes: Node<NodeData>[] = [
  {
    id: "agent-1",
    type: "agent",
    position: { x: 400, y: 100 },
    data: {
      label: "Main Agent",
      description: "Primary AI agent",
      tools: [],
      skills: [],
      storages: [],
    },
  },
];

const initialEdges: Edge[] = [];

let nodeId = 2;

function EditorFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] =
    useNodesState<Node<NodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock | null>(
    null,
  );
  const { screenToFlowPosition } = useReactFlow();

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
            style: { stroke: "var(--node-agent)", strokeWidth: 2 },
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
        id: `${type}-${nodeId++}`,
        type,
        position,
        data: {
          label: labels[type],
          description: descriptions[type],
          tools: [],
          skills: [],
          storages: [],
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes],
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
      <div ref={reactFlowWrapper} className="flex-1 h-full">
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
          <Controls className="!bg-card !border-border" />
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

export function AgentEditor() {
  return (
    <ReactFlowProvider>
      <EditorFlow />
    </ReactFlowProvider>
  );
}
