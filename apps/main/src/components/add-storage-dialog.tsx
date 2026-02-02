"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import type { StorageConfig } from "@general-agent/agent/config-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AddStorageDialogProps = {
  onAdd: (storage: StorageConfig) => void;
};

type Credential = {
  id: string;
  name: string;
  type: string;
};

export function AddStorageDialog({ onAdd }: AddStorageDialogProps) {
  const [open, setOpen] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [type, setType] = useState<"s3" | "r2">("r2");
  const [credentialId, setCredentialId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [mountPath, setMountPath] = useState("/mnt/storage");
  const [accessMode, setAccessMode] = useState<"readonly" | "full">("readonly");

  useEffect(() => {
    if (open) {
      // Load credentials when dialog opens
      fetch("/api/credential")
        .then((res) => res.json())
        .then((data) => {
          setCredentials(data.credentials || []);
        })
        .catch((error) => {
          console.error("Failed to load credentials:", error);
          toast.error("Failed to load credentials");
        });
    }
  }, [open]);

  const handleAdd = () => {
    if (!label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!bucketName.trim()) {
      toast.error("Bucket name is required");
      return;
    }

    const storage: StorageConfig = {
      type,
      credentialId: credentialId || undefined,
      config: {
        label: label.trim(),
        description: description.trim(),
        bucketName: bucketName.trim(),
        mountPath: mountPath.trim(),
        accessMode,
      },
    };

    onAdd(storage);
    setOpen(false);

    // Reset form
    setType("r2");
    setCredentialId("");
    setLabel("");
    setDescription("");
    setBucketName("");
    setMountPath("/mnt/storage");
    setAccessMode("readonly");

    toast.success("Storage added");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Storage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Storage Configuration</DialogTitle>
          <DialogDescription>
            Configure S3 or R2 storage to mount in the agent's sandbox
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="storage-type">Storage Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "s3" | "r2")}>
              <SelectTrigger id="storage-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="r2">Cloudflare R2</SelectItem>
                <SelectItem value="s3">Amazon S3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Credential */}
          <div className="space-y-2">
            <Label htmlFor="credential">Credential (Optional)</Label>
            {credentials.length > 0 ? (
              <Select value={credentialId} onValueChange={setCredentialId}>
                <SelectTrigger id="credential">
                  <SelectValue placeholder="Select credential (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {credentials.map((cred) => (
                    <SelectItem key={cred.id} value={cred.id}>
                      {cred.name} ({cred.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground p-2 border rounded">
                No credentials available. Create one first.
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Select a credential to use for authentication
            </p>
          </div>

          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="label">Label *</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Storage"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Storage for project files"
            />
          </div>

          {/* Bucket Name */}
          <div className="space-y-2">
            <Label htmlFor="bucket">Bucket Name *</Label>
            <Input
              id="bucket"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="my-bucket"
            />
          </div>

          {/* Mount Path */}
          <div className="space-y-2">
            <Label htmlFor="mount">Mount Path</Label>
            <Input
              id="mount"
              value={mountPath}
              onChange={(e) => setMountPath(e.target.value)}
              placeholder="/mnt/storage"
            />
            <p className="text-xs text-muted-foreground">
              Path where storage will be mounted in the sandbox
            </p>
          </div>

          {/* Access Mode */}
          <div className="space-y-2">
            <Label htmlFor="access-mode">Access Mode</Label>
            <Select
              value={accessMode}
              onValueChange={(v) => setAccessMode(v as "readonly" | "full")}
            >
              <SelectTrigger id="access-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="readonly">Read Only</SelectItem>
                <SelectItem value="full">Full Access</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Storage</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
