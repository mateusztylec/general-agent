"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { NodeData } from "@/lib/types";
import type { Node } from "@xyflow/react";
import { Bot } from "lucide-react";

type AgentPropertySheetProps = {
  node: Node<NodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
};

export function AgentPropertySheet({
  node,
  isOpen,
  onClose,
  onUpdate,
}: AgentPropertySheetProps) {
  if (!node) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-5 w-5" />
            </div>
            <SheetTitle>Main Agent Properties</SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={node.data.label}
              onChange={(e) =>
                onUpdate(node.id, { label: e.target.value })
              }
              placeholder="Main Agent"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-description">System Prompt</Label>
            <Textarea
              id="agent-description"
              value={node.data.description}
              onChange={(e) =>
                onUpdate(node.id, { description: e.target.value })
              }
              placeholder="System prompt for the main agent..."
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This will be used as the system prompt for the main agent.
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 border-t pt-4">
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
