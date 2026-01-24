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
import type { StorageBlock } from "@/lib/types";
import { HardDrive, Trash2 } from "lucide-react";

type StoragePropertySheetProps = {
  nodeId: string | null;
  block: StorageBlock | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, blockId: string, data: Partial<StorageBlock>) => void;
  onDelete: (nodeId: string, blockId: string) => void;
};

export function StoragePropertySheet({
  nodeId,
  block,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: StoragePropertySheetProps) {
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
            <div className="p-2 rounded-lg bg-sky-500 text-background">
              <HardDrive className="h-5 w-5" />
            </div>
            <SheetTitle>R2 Storage Properties</SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="storage-label">Label</Label>
            <Input
              id="storage-label"
              value={block.label}
              onChange={(e) =>
                onUpdate(nodeId, block.id, { label: e.target.value })
              }
              placeholder="My Storage"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage-description">Description</Label>
            <Textarea
              id="storage-description"
              value={block.description}
              onChange={(e) =>
                onUpdate(nodeId, block.id, { description: e.target.value })
              }
              placeholder="What data is stored here?"
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-medium">Connection Details</h3>

            <div className="space-y-2">
              <Label htmlFor="storage-endpoint">Endpoint</Label>
              <Input
                id="storage-endpoint"
                value={block.endpoint}
                onChange={(e) =>
                  onUpdate(nodeId, block.id, { endpoint: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage-bucket">Bucket Name</Label>
              <Input
                id="storage-bucket"
                value={block.bucketName}
                onChange={(e) =>
                  onUpdate(nodeId, block.id, { bucketName: e.target.value })
                }
                placeholder="my-bucket"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage-access-key">Access Key</Label>
              <Input
                id="storage-access-key"
                type="password"
                value={block.accessKey}
                onChange={(e) =>
                  onUpdate(nodeId, block.id, { accessKey: e.target.value })
                }
                placeholder="Access key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage-secret-key">Secret Key</Label>
              <Input
                id="storage-secret-key"
                type="password"
                value={block.secretKey}
                onChange={(e) =>
                  onUpdate(nodeId, block.id, { secretKey: e.target.value })
                }
                placeholder="Secret key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage-mount-path">Mount Path</Label>
              <Input
                id="storage-mount-path"
                value={block.mountPath}
                onChange={(e) =>
                  onUpdate(nodeId, block.id, { mountPath: e.target.value })
                }
                placeholder="/mnt/storage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage-access-mode">Access Mode</Label>
              <select
                id="storage-access-mode"
                value={block.accessMode}
                onChange={(e) =>
                  onUpdate(nodeId, block.id, {
                    accessMode: e.target.value as "readonly" | "full",
                  })
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="readonly">Read Only</option>
                <option value="full">Full Access</option>
              </select>
            </div>
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
            Delete Storage
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
