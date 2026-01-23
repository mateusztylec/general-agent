"use client";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { Cpu, HardDrive, Sparkles, Wrench, X } from "lucide-react";
import type React from "react";
import { memo } from "react";
import type { Block, BlockType, NodeData, StorageBlock } from "@/lib/types";

export const SubagentNode = memo(function SubagentNode({
  id,
  data,
  selected,
}: NodeProps<Node<NodeData>>) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const blockData = e.dataTransfer.getData("application/block");
    if (blockData) {
      const event = new CustomEvent("block-drop", {
        detail: { nodeId: id, block: JSON.parse(blockData) },
      });
      window.dispatchEvent(event);
    }
  };

  const handleRemoveBlock = (blockId: string, blockType: BlockType) => {
    const event = new CustomEvent("block-remove", {
      detail: { nodeId: id, blockId, blockType },
    });
    window.dispatchEvent(event);
  };

  const handleSelectBlock = (block: Block | StorageBlock) => {
    const event = new CustomEvent("block-select", {
      detail: { nodeId: id, block },
    });
    window.dispatchEvent(event);
  };

  return (
    <section
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      aria-label={`${data.label} node`}
      className={`rounded-2xl bg-card border-2 shadow-xl min-w-[220px] transition-all ${selected
          ? "border-node-subagent ring-2 ring-node-subagent/30"
          : "border-border"
        }`}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 bg-node-subagent/10 rounded-t-2xl">
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-node-subagent !border-2 !border-background"
        />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-node-subagent text-background">
            <Cpu className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{data.label}</div>
            <div className="text-xs text-muted-foreground truncate">
              {data.description}
            </div>
          </div>
        </div>
      </div>

      {/* Tools section */}
      <div className="px-3 py-2 border-b border-dashed border-border/50">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Wrench className="h-3 w-3" /> Tools
        </div>
        <div className="space-y-1.5 min-h-[32px]">
          {data.tools?.length > 0 ? (
            data.tools.map((tool) => (
              <div
                key={tool.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-node-tool/20 border border-node-tool/30 text-xs group hover:bg-node-tool/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleSelectBlock(tool)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                >
                  <Wrench className="h-3 w-3 text-node-tool flex-shrink-0" />
                  <span className="flex-1 truncate">{tool.label}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBlock(tool.id, "tool");
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded transition-opacity"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-[10px] text-muted-foreground/50 italic px-2 py-1">
              Drop tools here
            </div>
          )}
        </div>
      </div>

      {/* Skills section */}
      <div className="px-3 py-2 border-b border-dashed border-border/50">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Skills
        </div>
        <div className="space-y-1.5 min-h-[32px]">
          {data.skills?.length > 0 ? (
            data.skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-node-skill/20 border border-node-skill/30 text-xs group hover:bg-node-skill/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleSelectBlock(skill)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-node-skill flex-shrink-0" />
                  <span className="flex-1 truncate">{skill.label}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBlock(skill.id, "skill");
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded transition-opacity"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-[10px] text-muted-foreground/50 italic px-2 py-1">
              Drop skills here
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2 rounded-b-2xl">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <HardDrive className="h-3 w-3" /> Storage
        </div>
        <div className="space-y-1.5 min-h-[32px]">
          {data.storages?.length > 0 ? (
            data.storages.map((storage) => (
              <div
                key={storage.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30 text-xs group hover:bg-sky-500/30 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleSelectBlock(storage)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                >
                  <HardDrive className="h-3 w-3 text-sky-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{storage.label}</div>
                    <div className="text-[10px] text-sky-400/70 font-mono truncate">
                      {storage.mountPath}
                    </div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded ${storage.accessMode === "readonly"
                        ? "bg-sky-500/30 text-sky-300"
                        : "bg-amber-500/30 text-amber-300"
                      }`}
                  >
                    {storage.accessMode === "readonly" ? "RO" : "RW"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBlock(storage.id, "storage");
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/20 rounded transition-opacity"
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-[10px] text-muted-foreground/50 italic px-2 py-1">
              Drop storage here
            </div>
          )}
        </div>
      </div>
    </section>
  );
});
