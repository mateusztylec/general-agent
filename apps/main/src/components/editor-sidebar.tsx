"use client";

import {
  Bot,
  Cpu,
  GripVertical,
  HardDrive,
  Sparkles,
  Wrench,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import type {
  AnyBlock,
  BlockType,
  NodeType,
  SkillBlock,
  StorageBlock,
  SubagentToolBlock,
} from "@/lib/types";

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
    color: "bg-primary",
  },
  {
    type: "subagent",
    label: "Subagent",
    icon: <Cpu className="h-4 w-4" />,
    color: "bg-chart-1",
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
    color: "bg-chart-2",
  },
  {
    type: "skill",
    label: "Skill",
    icon: <Sparkles className="h-4 w-4" />,
    color: "bg-chart-4",
  },
  {
    type: "storage",
    label: "R2 Storage",
    icon: <HardDrive className="h-4 w-4" />,
    color: "bg-sky-500",
  },
];

let blockId = 1;

export function EditorSidebar() {
  const [isExpanded, setIsExpanded] = useState(true);

  const onDragStart = (
    event: React.DragEvent,
    type: NodeType | BlockType,
  ) => {
    if (type === "agent" || type === "subagent") {
      event.dataTransfer.setData("application/reactflow", type);
      event.dataTransfer.effectAllowed = "move";
      return;
    }

    let newBlock: AnyBlock;

    if (type === "storage") {
      newBlock = {
        id: `block-${blockId++}`,
        type: "storage",
        storageType: "r2",
        label: "New Storage",
        description: "R2 Storage Configuration",
        credentialId: "", // Will be set when user selects credential
        bucketName: "",
        mountPath: "/mnt/storage",
        accessMode: "readonly",
      } satisfies StorageBlock;
    } else if (type === "tool") {
      newBlock = {
        id: `block-${blockId++}`,
        type: "tool",
        toolName: "", // Empty - user must select from dropdown
      } satisfies SubagentToolBlock;
    } else {
      // skill
      newBlock = {
        id: `block-${blockId++}`,
        type: "skill",
        label: "skill-name",
        description: "Skill description",
      } satisfies SkillBlock;
    }

    event.dataTransfer.setData("application/block", JSON.stringify(newBlock));
    event.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside
      className={`border-r border-sidebar-border bg-sidebar h-full transition-all ${isExpanded ? "w-64" : "w-16"
        } flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h2 className={`font-semibold ${isExpanded ? "block" : "hidden"}`}>
          Components
        </h2>
      </div>

      {/* Draggable Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Nodes Section */}
        <div>
          <div
            className={`text-[10px] uppercase tracking-wider text-muted-foreground mb-3 ${isExpanded ? "block" : "hidden"
              }`}
          >
            Nodes
          </div>
          <div className="space-y-2">
            {nodeItems.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => onDragStart(e, item.type)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors cursor-move group"
              >
                <div className={`p-2 rounded ${item.color} text-background`}>
                  {item.icon}
                </div>
                <span
                  className={`text-sm font-medium flex-1 ${isExpanded ? "block" : "hidden"
                    }`}
                >
                  {item.label}
                </span>
                <GripVertical
                  className={`h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ${isExpanded ? "block" : "hidden"
                    }`}
                />
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Blocks Section */}
        <div>
          <div
            className={`text-[10px] uppercase tracking-wider text-muted-foreground mb-3 ${isExpanded ? "block" : "hidden"
              }`}
          >
            Blocks
          </div>
          <div className="space-y-2">
            {blockItems.map((item) => (
              <div
                key={item.type}
                draggable
                onDragStart={(e) => onDragStart(e, item.type)}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors cursor-move group"
              >
                <div className={`p-2 rounded ${item.color} text-background`}>
                  {item.icon}
                </div>
                <span
                  className={`text-sm font-medium flex-1 ${isExpanded ? "block" : "hidden"
                    }`}
                >
                  {item.label}
                </span>
                <GripVertical
                  className={`h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ${isExpanded ? "block" : "hidden"
                    }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
