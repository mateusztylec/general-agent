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
import type { NodeData } from "@/lib/types";
import type { Node } from "@xyflow/react";
import { Globe } from "lucide-react";

type SandboxPropertySheetProps = {
  node: Node<NodeData> | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, data: Partial<NodeData>) => void;
};

export function SandboxPropertySheet({
  node,
  isOpen,
  onClose,
  onUpdate,
}: SandboxPropertySheetProps) {
  if (!node) return null;

  const internetAccess = node.data.sandbox?.internetAccess ?? false;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500 text-background">
              <Globe className="h-5 w-5" />
            </div>
            <SheetTitle>Sandbox Settings</SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-6 overflow-y-auto flex-1 mt-6">
          <div className="space-y-2">
            <Label htmlFor="sandbox-internet-access">Internet access</Label>
            <Select
              value={internetAccess ? "true" : "false"}
              onValueChange={(value) =>
                onUpdate(node.id, {
                  sandbox: { internetAccess: value === "true" },
                })
              }
            >
              <SelectTrigger id="sandbox-internet-access">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Enabled</SelectItem>
                <SelectItem value="false">Disabled</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Disabling internet access prevents outbound network connections.
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
