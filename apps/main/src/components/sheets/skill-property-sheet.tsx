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
import type { SkillBlock } from "@/lib/types";
import { Sparkles, Trash2 } from "lucide-react";

type SkillPropertySheetProps = {
  nodeId: string | null;
  block: SkillBlock | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, blockId: string, data: Partial<SkillBlock>) => void;
  onDelete: (nodeId: string, blockId: string) => void;
};

export function SkillPropertySheet({
  nodeId,
  block,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: SkillPropertySheetProps) {
  if (!block || !nodeId) return null;

  const handleDelete = () => {
    onDelete(nodeId, block.id);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-4 text-background">
              <Sparkles className="h-5 w-5" />
            </div>
            <SheetTitle>Skill Properties</SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="skill-name">Skill Name</Label>
            <Input
              id="skill-name"
              value={block.label}
              onChange={(e) =>
                onUpdate(nodeId, block.id, { label: e.target.value })
              }
              placeholder="python-expert, web-scraper..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-description">Description</Label>
            <Textarea
              id="skill-description"
              value={block.description}
              onChange={(e) =>
                onUpdate(nodeId, block.id, { description: e.target.value })
              }
              placeholder="What capability does this skill provide?"
              rows={4}
              className="resize-none"
            />
          </div>
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
            Delete Skill
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
