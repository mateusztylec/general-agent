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
import { Bot } from "lucide-react";

type AgentPropertySheetProps = {
  node: Node<NodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
};

const LLM_PROVIDERS = ["openai", "anthropic", "google"] as const;

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
            <Label htmlFor="agent-provider">Provider</Label>
            <Select
              value={node.data.llmProvider ?? "anthropic"}
              onValueChange={(value) =>
                onUpdate(node.id, {
                  llmProvider: value as (typeof LLM_PROVIDERS)[number],
                })
              }
            >
              <SelectTrigger id="agent-provider">
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
            <Label htmlFor="agent-model">Model</Label>
            <Input
              id="agent-model"
              value={node.data.llmModel ?? ""}
              onChange={(e) =>
                onUpdate(node.id, { llmModel: e.target.value })
              }
              placeholder="claude-sonnet-4-5-20250929"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-system-prompt">System Prompt</Label>
            <Textarea
              id="agent-system-prompt"
              value={node.data.llmSystemPrompt ?? ""}
              onChange={(e) =>
                onUpdate(node.id, { llmSystemPrompt: e.target.value })
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
