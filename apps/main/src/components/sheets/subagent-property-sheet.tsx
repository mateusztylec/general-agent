"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import type { NodeData } from "@/lib/types";
import type { Node } from "@xyflow/react";
import { Cpu } from "lucide-react";

type SubagentPropertySheetProps = {
  node: Node<NodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
};

const LLM_PROVIDERS = ["openai", "anthropic", "google"] as const;

export function SubagentPropertySheet({
  node,
  isOpen,
  onClose,
  onUpdate,
}: SubagentPropertySheetProps) {
  if (!node) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-1 text-background">
              <Cpu className="h-5 w-5" />
            </div>
            <SheetTitle>Subagent Properties</SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="subagent-name">Name</Label>
            <Input
              id="subagent-name"
              value={node.data.label}
              onChange={(e) =>
                onUpdate(node.id, { label: e.target.value })
              }
              placeholder="Subagent name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subagent-description">Description</Label>
            <Textarea
              id="subagent-description"
              value={node.data.description}
              onChange={(e) =>
                onUpdate(node.id, { description: e.target.value })
              }
              placeholder="What does this subagent do?"
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This description helps the main agent decide when to use this subagent.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subagent-provider">Provider</Label>
            <Select
              value={node.data.llmProvider ?? "anthropic"}
              onValueChange={(value) =>
                onUpdate(node.id, {
                  llmProvider: value as (typeof LLM_PROVIDERS)[number],
                })
              }
            >
              <SelectTrigger id="subagent-provider">
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subagent-model">Model</Label>
            <Input
              id="subagent-model"
              value={node.data.llmModel ?? ""}
              onChange={(e) =>
                onUpdate(node.id, { llmModel: e.target.value })
              }
              placeholder="claude-sonnet-4-5-20250929"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subagent-system-prompt">System Prompt</Label>
            <Textarea
              id="subagent-system-prompt"
              value={node.data.llmSystemPrompt ?? ""}
              onChange={(e) =>
                onUpdate(node.id, { llmSystemPrompt: e.target.value })
              }
              placeholder="System prompt for this subagent..."
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Instructions for how this subagent should behave.
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
