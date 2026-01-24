"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Node } from "@xyflow/react";
import type { NodeData, SubagentToolBlock } from "@/lib/types";
import {
  AvailableToolSchema,
  SUBAGENT_TOOL_DEFINITIONS,
  type AvailableTool,
} from "@general-agent/agent/config-types";
import { Trash2, Wrench } from "lucide-react";
import { useMemo } from "react";

type ToolPropertySheetProps = {
  nodeId: string | null;
  block: SubagentToolBlock | null;
  node: Node<NodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (
    nodeId: string,
    blockId: string,
    data: Partial<SubagentToolBlock>
  ) => void;
  onDelete: (nodeId: string, blockId: string) => void;
};

export function ToolPropertySheet({
  nodeId,
  block,
  node,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: ToolPropertySheetProps) {
  if (!block || !nodeId) return null;

  const isConfigured = Boolean(block.toolName);
  const isValidTool =
    isConfigured && block.toolName in SUBAGENT_TOOL_DEFINITIONS;

  // Get all available tools
  const allTools = AvailableToolSchema.options;

  // Filter out tools already added to this subagent (except the current one)
  const availableTools = useMemo(() => {
    if (!node) return allTools;
    const usedToolNames = node.data.tools
      .filter(
        (tool): tool is SubagentToolBlock & { toolName: AvailableTool } =>
          tool.id !== block.id && tool.toolName !== "",
      )
      .map((tool) => tool.toolName);
    return allTools.filter((tool) => !usedToolNames.includes(tool));
  }, [node, block.id, allTools]);

  const handleDelete = () => {
    onDelete(nodeId, block.id);
    onClose();
  };

  const handleToolSelect = (toolName: string) => {
    onUpdate(nodeId, block.id, { toolName: toolName as AvailableTool });
  };

  const selectedToolDefinition = isValidTool
    ? SUBAGENT_TOOL_DEFINITIONS[block.toolName as AvailableTool]
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-2 text-background">
              <Wrench className="h-5 w-5" />
            </div>
            <SheetTitle>Tool Properties</SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-6 overflow-y-auto flex-1 mt-6">
          <div className="space-y-2">
            <Label htmlFor="tool-name">Tool</Label>
            <Select
              value={isValidTool ? block.toolName : ""}
              onValueChange={handleToolSelect}
              disabled={isValidTool}
            >
              <SelectTrigger id="tool-name">
                <SelectValue placeholder="Select a tool..." />
              </SelectTrigger>
              <SelectContent>
                {availableTools.map((tool) => (
                  <SelectItem key={tool} value={tool}>
                    {SUBAGENT_TOOL_DEFINITIONS[tool].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isValidTool && (
              <p className="text-xs text-muted-foreground">
                Tool cannot be changed once selected. Delete and add a new one
                to change.
              </p>
            )}
          </div>

          {isConfigured && selectedToolDefinition && (
            <div className="space-y-2">
              <Label htmlFor="tool-description">Description</Label>
              <div
                id="tool-description"
                className="rounded-md bg-muted px-3 py-2 text-sm text-foreground"
              >
                {selectedToolDefinition.description}
              </div>
              <p className="text-xs text-muted-foreground">
                This description is provided by OpenCode and cannot be edited.
              </p>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 border-t pt-4 space-y-3">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
          <Button
            onClick={handleDelete}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Tool
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
