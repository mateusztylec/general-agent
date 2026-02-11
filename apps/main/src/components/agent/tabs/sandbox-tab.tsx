"use client";

import type { AgentConfig, StorageConfig } from "@general-agent/agent/config-types";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { AddStorageDialog, EditStorageDialog } from "@/components/agent/add-storage-dialog";
import { useState } from "react";

type SandboxTabProps = {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
};

export function SandboxTab({ config, onChange }: SandboxTabProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleAddStorage = (storage: StorageConfig) => {
    const currentStorage = config.storage || [];
    onChange({
      ...config,
      storage: [...currentStorage, storage],
    });
  };

  const handleEditStorage = (index: number, storage: StorageConfig) => {
    const currentStorage = config.storage || [];
    onChange({
      ...config,
      storage: currentStorage.map((s, i) => (i === index ? storage : s)),
    });
  };

  const handleRemoveStorage = (index: number) => {
    const currentStorage = config.storage || [];
    onChange({
      ...config,
      storage: currentStorage.filter((_, i) => i !== index),
    });
  };

  const editingStorage = editIndex !== null ? (config.storage ?? [])[editIndex] : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Sandbox Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the execution environment for this agent
        </p>
      </div>

      <Separator />

      {/* Internet Access */}
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="internet-access"
            checked={config.sandbox?.internetAccess || false}
            onChange={(e) =>
              onChange({
                ...config,
                sandbox: {
                  ...config.sandbox,
                  internetAccess: e.target.checked,
                },
              })
            }
            className="h-4 w-4 rounded border-border mt-1"
          />
          <div className="flex-1">
            <Label htmlFor="internet-access" className="cursor-pointer font-medium">
              Internet Access
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Allow the agent to access external websites and APIs from its sandbox environment.
              Useful for agents that need to fetch data, call APIs, or interact with web services.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Storage Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Storage Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure persistent storage for this agent (S3, R2, etc.)
            </p>
          </div>
          <AddStorageDialog onAdd={handleAddStorage} />
        </div>

        {config.storage && config.storage.length > 0 ? (
          <div className="space-y-2">
            {config.storage.map((storage, index) => (
              <div key={index} className="p-4 border rounded-lg flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {storage.type.toUpperCase()} Storage
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {storage.config?.label || "Unnamed storage"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Bucket: {storage.config?.bucketName || "N/A"} • Mount: {storage.config?.mountPath || "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Access: {storage.config?.accessMode || "readonly"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditIndex(index)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStorage(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 border-2 border-dashed rounded-lg text-center text-sm text-muted-foreground">
            No storage configured yet. Click "Add Storage" to get started.
          </div>
        )}
      </div>

      {editingStorage && (
        <EditStorageDialog
          open={editIndex !== null}
          onOpenChange={(open) => { if (!open) setEditIndex(null); }}
          initialValues={editingStorage}
          onEdit={(storage) => {
            if (editIndex !== null) handleEditStorage(editIndex, storage);
            setEditIndex(null);
          }}
        />
      )}
    </div>
  );
}
