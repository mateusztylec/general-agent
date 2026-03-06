"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Loader2, CheckCircle2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import type { StorageConfig } from "@general-agent/agent/config-types";
import type { StorageProvider } from "@general-agent/encryption/credentials";
import type { TestStatus } from "@/types/ui";
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
import { testCredentialAction } from "@/actions/credential";

type AddStorageDialogProps = {
  onAdd: (storage: StorageConfig) => void;
};

type EditStorageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues: StorageConfig;
  onEdit: (storage: StorageConfig) => void;
};

type Credential = {
  id: string;
  name: string;
  type: string;
  provider: string;
};

function StorageDialogForm({
  mode,
  initialValues,
  onSave,
  onCancel,
}: {
  mode: "add" | "edit";
  initialValues?: StorageConfig;
  onSave: (storage: StorageConfig) => void;
  onCancel: () => void;
}) {
  const [credentials, setCredentials] = useState<Credential[]>([]);

  const [type, setType] = useState<StorageProvider>(initialValues?.type ?? "cloudflare_r2");
  const [credentialId, setCredentialId] = useState(initialValues?.credentialId ?? "");
  const [label, setLabel] = useState(initialValues?.config?.label ?? "");
  const [description, setDescription] = useState(initialValues?.config?.description ?? "");
  const [bucketName, setBucketName] = useState(initialValues?.config?.bucketName ?? "");
  const [mountPath, setMountPath] = useState(initialValues?.config?.mountPath ?? "/mnt/storage");
  const [accessMode, setAccessMode] = useState<"readonly" | "full">(
    initialValues?.config?.accessMode ?? "readonly"
  );

  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState("");

  useEffect(() => {
    fetch("/api/credential")
      .then((res) => res.json())
      .then((data) => setCredentials(data.credentials || []))
      .catch(() => toast.error("Failed to load credentials"));
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setCredentialId("");
    setTestStatus("idle");
  }, [type]);

  const handleSave = () => {
    if (!label.trim()) {
      toast.error("Label is required");
      return;
    }
    if (!bucketName.trim()) {
      toast.error("Bucket name is required");
      return;
    }

    onSave({
      type,
      credentialId: credentialId || undefined,
      config: {
        label: label.trim(),
        description: description.trim(),
        bucketName: bucketName.trim(),
        mountPath: mountPath.trim(),
        accessMode,
      },
    });
  };

  const handleTest = async () => {
    if (!credentialId || !bucketName.trim()) return;
    setTestStatus("loading");
    setTestError("");

    try {
      const result = await testCredentialAction(credentialId, bucketName.trim());
      if (result.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(result.error || "Connection failed");
      }
    } catch (err) {
      setTestStatus("error");
      setTestError(err instanceof Error ? err.message : "Connection failed");
    }
  };

  const canTest = !!credentialId && bucketName.trim().length > 0;

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="storage-type">Storage Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as StorageProvider)}>
            <SelectTrigger id="storage-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cloudflare_r2">Cloudflare R2</SelectItem>
              <SelectItem value="aws_s3">Amazon S3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="credential">Credential (Optional)</Label>
          {(() => {
            const matchingCredentials = credentials.filter(
              (cred) =>
                cred.type === "storage_credentials" && cred.provider === type
            );
            if (matchingCredentials.length > 0) {
              return (
                <Select value={credentialId} onValueChange={(v) => { setCredentialId(v); setTestStatus("idle"); }}>
                  <SelectTrigger id="credential">
                    <SelectValue placeholder="Select credential (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchingCredentials.map((cred) => (
                      <SelectItem key={cred.id} value={cred.id}>
                        {cred.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }
            const label = type === "aws_s3" ? "Amazon S3" : "Cloudflare R2";
            return (
              <div className="text-sm text-muted-foreground p-2 border rounded">
                {credentials.length > 0
                  ? `No ${label} credentials. Create one first.`
                  : "No credentials available. Create one first."}
              </div>
            );
          })()}
          <p className="text-xs text-muted-foreground">
            Select a credential to use for authentication
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="label">Label *</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My Storage"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Storage for project files"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bucket">Bucket Name *</Label>
          <Input
            id="bucket"
            value={bucketName}
            onChange={(e) => { setBucketName(e.target.value); setTestStatus("idle"); }}
            placeholder="my-bucket"
          />
        </div>

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

        {testStatus === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Connection successful
          </div>
        )}
        {testStatus === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {testError}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={handleTest}
          disabled={!canTest || testStatus === "loading"}
        >
          {testStatus === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {testStatus === "loading" ? "Testing..." : "Test Connection"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {mode === "edit" ? "Save Changes" : "Add Storage"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function AddStorageDialog({ onAdd }: AddStorageDialogProps) {
  const [open, setOpen] = useState(false);

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
        <StorageDialogForm
          mode="add"
          onSave={(storage) => {
            onAdd(storage);
            setOpen(false);
            toast.success("Storage added");
          }}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditStorageDialog({ open, onOpenChange, initialValues, onEdit }: EditStorageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Storage Configuration</DialogTitle>
          <DialogDescription>
            Update S3 or R2 storage configuration for this agent
          </DialogDescription>
        </DialogHeader>
        <StorageDialogForm
          mode="edit"
          initialValues={initialValues}
          onSave={(storage) => {
            onEdit(storage);
            onOpenChange(false);
            toast.success("Storage updated");
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
