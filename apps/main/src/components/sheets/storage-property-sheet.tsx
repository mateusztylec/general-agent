"use client";

import { useState, useEffect } from "react";
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
import { HardDrive, Trash2, Plus, Edit2, Loader2 } from "lucide-react";
import { CredentialDialog } from "@/components/credential-dialog";

type StoragePropertySheetProps = {
  nodeId: string | null;
  block: StorageBlock | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (nodeId: string, blockId: string, data: Partial<StorageBlock>) => void;
  onDelete: (nodeId: string, blockId: string) => void;
};

type Credential = {
  id: string;
  name: string;
  type: string;
};

export function StoragePropertySheet({
  nodeId,
  block,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: StoragePropertySheetProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [editingCredentialId, setEditingCredentialId] = useState<string | undefined>();

  // Load credentials when sheet opens
  useEffect(() => {
    if (isOpen && block) {
      loadCredentials();
    }
  }, [isOpen, block?.storageType]);

  const loadCredentials = async () => {
    setLoadingCredentials(true);
    try {
      const response = await fetch("/api/credential");
      const data = await response.json();

      // Filter credentials by storage type
      const filtered = data.credentials.filter((c: Credential) => {
        if (block?.storageType === "s3") {
          return c.type === "s3_credentials";
        } else {
          return c.type === "r2_credentials";
        }
      });

      setCredentials(filtered);
    } catch (error) {
      console.error("Failed to load credentials:", error);
    } finally {
      setLoadingCredentials(false);
    }
  };

  if (!block || !nodeId) return null;

  const handleDelete = () => {
    onDelete(nodeId, block.id);
    onClose();
  };

  const handleCreateCredential = () => {
    setEditingCredentialId(undefined);
    setCredentialDialogOpen(true);
  };

  const handleEditCredential = () => {
    if (block.credentialId) {
      setEditingCredentialId(block.credentialId);
      setCredentialDialogOpen(true);
    }
  };

  const handleCredentialSaved = (credentialId: string) => {
    onUpdate(nodeId, block.id, { credentialId });
    loadCredentials(); // Reload the list
  };

  const selectedCredential = credentials.find(c => c.id === block.credentialId);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500 text-background">
                <HardDrive className="h-5 w-5" />
              </div>
              <SheetTitle>
                {block.storageType === "s3" ? "S3" : "R2"} Storage Properties
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="px-4 space-y-6 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="storage-type">Storage Type</Label>
              <select
                id="storage-type"
                value={block.storageType || "r2"}
                onChange={(e) => {
                  const newType = e.target.value as "s3" | "r2";
                  onUpdate(nodeId, block.id, {
                    storageType: newType,
                    description: `${newType === "s3" ? "S3" : "R2"} Storage Configuration`,
                    credentialId: "", // Reset credential when changing type
                  });
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="r2">Cloudflare R2</option>
                <option value="s3">Amazon S3</option>
              </select>
            </div>

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
              <h3 className="text-sm font-medium">Credentials</h3>

              {loadingCredentials ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="credential-select">Select Credential</Label>
                    <div className="flex gap-2">
                      <select
                        id="credential-select"
                        value={block.credentialId || ""}
                        onChange={(e) =>
                          onUpdate(nodeId, block.id, { credentialId: e.target.value })
                        }
                        className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select a credential...</option>
                        {credentials.map((cred) => (
                          <option key={cred.id} value={cred.id}>
                            {cred.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCreateCredential}
                        title="Create new credential"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {selectedCredential && (
                    <div className="bg-muted p-3 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{selectedCredential.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedCredential.type === "s3_credentials" ? "S3" : "R2"} Credential
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleEditCredential}
                          title="Edit credential"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-medium">Storage Configuration</h3>

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

      <CredentialDialog
        isOpen={credentialDialogOpen}
        onClose={() => setCredentialDialogOpen(false)}
        onSave={handleCredentialSaved}
        storageType={block.storageType}
        existingCredentialId={editingCredentialId}
      />
    </>
  );
}
