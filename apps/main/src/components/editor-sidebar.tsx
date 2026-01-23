"use client";

import type { Node } from "@xyflow/react";
import {
  Bot,
  Cpu,
  Eye,
  EyeOff,
  GripVertical,
  HardDrive,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  Block,
  BlockType,
  NodeData,
  NodeType,
  SelectedBlock,
  StorageBlock,
  UpdateBlockData,
} from "@/lib/types";
import { isStorageBlock } from "@/lib/types";

interface EditorSidebarProps {
  selectedNode: Node<NodeData> | null;
  selectedBlock: SelectedBlock | null;
  onUpdateNode: (nodeId: string, data: Partial<NodeData>) => void;
  onUpdateBlock: (
    nodeId: string,
    blockId: string,
    data: UpdateBlockData,
  ) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteBlock: (
    nodeId: string,
    blockId: string,
    blockType: BlockType,
  ) => void;
}

const nodeItems: {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
    {
      type: "agent",
      label: "Main Agent",
      icon: <Bot className="h-4 w-4" />,
      color: "bg-node-agent",
    },
    {
      type: "subagent",
      label: "Subagent",
      icon: <Cpu className="h-4 w-4" />,
      color: "bg-node-subagent",
    },
  ];

const blockItems: {
  type: BlockType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
    {
      type: "tool",
      label: "Tool",
      icon: <Wrench className="h-4 w-4" />,
      color: "bg-node-tool",
    },
    {
      type: "skill",
      label: "Skill",
      icon: <Sparkles className="h-4 w-4" />,
      color: "bg-node-skill",
    },
    {
      type: "storage",
      label: "R2 Storage",
      icon: <HardDrive className="h-4 w-4" />,
      color: "bg-sky-500",
    },
  ];

let blockId = 1;

function StorageBlockProperties({
  block,
  nodeId,
  onUpdate,
  onDelete,
}: {
  block: StorageBlock;
  nodeId: string;
  onUpdate: (
    nodeId: string,
    blockId: string,
    data: Partial<StorageBlock>,
  ) => void;
  onDelete: (nodeId: string, blockId: string, blockType: BlockType) => void;
}) {
  const [showSecretKey, setShowSecretKey] = useState(false);

  const handleMountPathChange = (value: string) => {
    const cleanPath = value.replace(/^\/data\/?/, "").replace(/^\/+/, "");
    const finalPath = `/data/${cleanPath}`;
    onUpdate(nodeId, block.id, { mountPath: finalPath });
  };

  return (
    <div className="border-t border-sidebar-border p-4 bg-sidebar max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Storage Properties
        </Label>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(nodeId, block.id, "storage")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <Label
            htmlFor="storage-label"
            className="text-xs text-muted-foreground"
          >
            Label
          </Label>
          <Input
            id="storage-label"
            value={block.label}
            onChange={(e) =>
              onUpdate(nodeId, block.id, { label: e.target.value })
            }
            className="bg-input border-border h-8 text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label
            htmlFor="storage-description"
            className="text-xs text-muted-foreground"
          >
            Description
          </Label>
          <Textarea
            id="storage-description"
            value={block.description}
            onChange={(e) =>
              onUpdate(nodeId, block.id, { description: e.target.value })
            }
            className="bg-input border-border resize-none text-sm"
            rows={2}
          />
        </div>

        <Separator />

        {/* Endpoint URL */}
        <div className="space-y-1.5">
          <Label htmlFor="endpoint" className="text-xs text-muted-foreground">
            Endpoint URL
          </Label>
          <Input
            id="endpoint"
            placeholder="https://account.r2.cloudflarestorage.com"
            value={block.endpoint}
            onChange={(e) =>
              onUpdate(nodeId, block.id, { endpoint: e.target.value })
            }
            className="bg-input border-border h-8 text-sm"
          />
        </div>

        {/* Bucket Name */}
        <div className="space-y-1.5">
          <Label htmlFor="bucket" className="text-xs text-muted-foreground">
            Bucket Name
          </Label>
          <Input
            id="bucket"
            placeholder="my-bucket"
            value={block.bucketName}
            onChange={(e) =>
              onUpdate(nodeId, block.id, { bucketName: e.target.value })
            }
            className="bg-input border-border h-8 text-sm"
          />
        </div>

        {/* Access Key */}
        <div className="space-y-1.5">
          <Label htmlFor="accessKey" className="text-xs text-muted-foreground">
            Access Key ID
          </Label>
          <Input
            id="accessKey"
            placeholder="ACCESS_KEY_ID"
            value={block.accessKey}
            onChange={(e) =>
              onUpdate(nodeId, block.id, { accessKey: e.target.value })
            }
            className="bg-input border-border h-8 text-sm font-mono"
          />
        </div>

        {/* Secret Key */}
        <div className="space-y-1.5">
          <Label htmlFor="secretKey" className="text-xs text-muted-foreground">
            Secret Access Key
          </Label>
          <div className="relative">
            <Input
              id="secretKey"
              type={showSecretKey ? "text" : "password"}
              placeholder="SECRET_ACCESS_KEY"
              value={block.secretKey}
              onChange={(e) =>
                onUpdate(nodeId, block.id, { secretKey: e.target.value })
              }
              className="bg-input border-border h-8 text-sm font-mono pr-9"
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSecretKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mount Path */}
        <div className="space-y-1.5">
          <Label htmlFor="mountPath" className="text-xs text-muted-foreground">
            Mount Path
          </Label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1.5 rounded-l border border-r-0 border-border">
              /data/
            </span>
            <Input
              id="mountPath"
              placeholder="folder_name"
              value={block.mountPath.replace(/^\/data\/?/, "")}
              onChange={(e) => handleMountPathChange(e.target.value)}
              className="bg-input border-border h-8 text-sm font-mono rounded-l-none"
            />
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            Full path:{" "}
            <span className="font-mono">{block.mountPath || "/data/"}</span>
          </p>
        </div>

        {/* Access Mode */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Access Mode</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdate(nodeId, block.id, { accessMode: "readonly" })
              }
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${block.accessMode === "readonly"
                  ? "bg-sky-500/20 border-sky-500/50 text-sky-400"
                  : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                }`}
            >
              <Eye className="h-3.5 w-3.5" />
              Read Only
            </button>
            <button
              type="button"
              onClick={() => onUpdate(nodeId, block.id, { accessMode: "full" })}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${block.accessMode === "full"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                  : "bg-secondary/50 border-border text-muted-foreground hover:bg-secondary"
                }`}
            >
              <HardDrive className="h-3.5 w-3.5" />
              Full Access
            </button>
          </div>
        </div>

        {/* Status indicator */}
        {block.endpoint && block.bucketName && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400">Storage configured</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function EditorSidebar({
  selectedNode,
  selectedBlock,
  onUpdateNode,
  onUpdateBlock,
  onDeleteNode,
  onDeleteBlock,
}: EditorSidebarProps) {
  const onDragStartNode = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragStartBlock = (
    event: React.DragEvent,
    blockType: BlockType,
    label: string,
  ) => {
    if (blockType === "storage") {
      const storageBlock: StorageBlock = {
        id: `block-${blockId++}`,
        type: "storage",
        label,
        description: "R2 bucket storage",
        endpoint: "",
        bucketName: "",
        accessKey: "",
        secretKey: "",
        mountPath: "/data/",
        accessMode: "readonly",
      };
      event.dataTransfer.setData(
        "application/block",
        JSON.stringify(storageBlock),
      );
    } else {
      const block: Block = {
        id: `block-${blockId++}`,
        type: blockType,
        label,
        description:
          blockType === "tool" ? "External capability" : "Learned ability",
      };
      event.dataTransfer.setData("application/block", JSON.stringify(block));
    }
    event.dataTransfer.effectAllowed = "copy";
  };

  const isStorage = selectedBlock && isStorageBlock(selectedBlock.block);

  return (
    <aside className="w-72 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold text-sidebar-foreground">
          Agent Editor
        </h1>
        <p className="text-sm text-muted-foreground">
          Build your agent workflow
        </p>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Agents (drag to canvas)
          </Label>
          <div className="space-y-2">
            {nodeItems.map((item) => (
              <button
                key={item.type}
                type="button"
                draggable
                onDragStart={(e) => onDragStartNode(e, item.type)}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border cursor-grab hover:bg-secondary transition-colors active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className={`p-2 rounded-md ${item.color} text-background`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Blocks (drag into agents)
          </Label>
          <div className="space-y-2">
            {blockItems.map((item) => (
              <button
                key={item.type}
                type="button"
                draggable
                onDragStart={(e) => onDragStartBlock(e, item.type, item.label)}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border cursor-grab hover:bg-secondary transition-colors active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <div className={`p-2 rounded-md ${item.color} text-background`}>
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            How it works
          </Label>
          <div className="text-xs text-muted-foreground space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border">
            <p>1. Drag agents onto the canvas</p>
            <p>2. Connect Main Agent to Subagents</p>
            <p>3. Drop Tools, Skills & Storage into agents</p>
            <p>4. Click blocks to edit properties</p>
            <p className="text-muted-foreground/70 pt-1 border-t border-border/50">
              Only Main Agents can have Subagents
            </p>
          </div>
        </div>
      </div>

      {selectedBlock && isStorage && (
        <StorageBlockProperties
          block={selectedBlock.block as StorageBlock}
          nodeId={selectedBlock.nodeId}
          onUpdate={onUpdateBlock}
          onDelete={onDeleteBlock}
        />
      )}

      {/* Block Properties Panel (Tool/Skill) */}
      {selectedBlock && !isStorage && (
        <div className="border-t border-sidebar-border p-4 bg-sidebar">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Block Properties
            </Label>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() =>
                onDeleteBlock(
                  selectedBlock.nodeId,
                  selectedBlock.block.id,
                  selectedBlock.block.type,
                )
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="block-label" className="text-sm">
                Label
              </Label>
              <Input
                id="block-label"
                value={selectedBlock.block.label}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.nodeId, selectedBlock.block.id, {
                    label: e.target.value,
                  })
                }
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-description" className="text-sm">
                Description
              </Label>
              <Textarea
                id="block-description"
                value={selectedBlock.block.description}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.nodeId, selectedBlock.block.id, {
                    description: e.target.value,
                  })
                }
                className="bg-input border-border resize-none"
                rows={2}
              />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="font-medium">Type:</span>
              <span
                className={`capitalize px-2 py-0.5 rounded ${selectedBlock.block.type === "tool"
                    ? "bg-node-tool/20 text-node-tool"
                    : "bg-node-skill/20 text-node-skill"
                  }`}
              >
                {selectedBlock.block.type}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Node Properties Panel */}
      {selectedNode && !selectedBlock && (
        <div className="border-t border-sidebar-border p-4 bg-sidebar max-h-[50vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Properties
            </Label>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDeleteNode(selectedNode.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="node-label" className="text-sm">
                Label
              </Label>
              <Input
                id="node-label"
                value={selectedNode.data.label}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, { label: e.target.value })
                }
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="node-description" className="text-sm">
                Description
              </Label>
              <Textarea
                id="node-description"
                value={selectedNode.data.description}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, { description: e.target.value })
                }
                className="bg-input border-border resize-none"
                rows={2}
              />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="font-medium">Type:</span>
              <span className="capitalize px-2 py-0.5 rounded bg-secondary">
                {selectedNode.type}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
