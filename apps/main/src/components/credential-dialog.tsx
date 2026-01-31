"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Key, Loader2 } from "lucide-react";

type CredentialType = "s3_credentials" | "r2_credentials";

type CredentialDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentialId: string) => void;
  storageType: "s3" | "r2";
  existingCredentialId?: string;
};

type CredentialData = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function CredentialDialog({
  isOpen,
  onClose,
  onSave,
  storageType,
  existingCredentialId,
}: CredentialDialogProps) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const credentialType: CredentialType = storageType === "s3" ? "s3_credentials" : "r2_credentials";

  // Load existing credential if editing
  useEffect(() => {
    if (isOpen && existingCredentialId) {
      setLoadingExisting(true);
      fetch(`/api/credential/${existingCredentialId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.credential) {
            setName(data.credential.name);
            const credData = data.credential.data as CredentialData;
            setEndpoint(credData.endpoint || "");
            setAccessKeyId(credData.accessKeyId || "");
            // Secret is masked, don't set it
            setSecretAccessKey("");
          }
        })
        .catch((err) => console.error("Failed to load credential:", err))
        .finally(() => setLoadingExisting(false));
    } else if (isOpen) {
      // Reset form for new credential
      setName("");
      setEndpoint("");
      setAccessKeyId("");
      setSecretAccessKey("");
    }
  }, [isOpen, existingCredentialId]);

  const handleSave = async () => {
    setLoading(true);

    try {
      const credentialData: Record<string, unknown> = {
        endpoint,
        accessKeyId,
      };

      // Only include secret if user entered one (for updates, blank means don't change)
      if (secretAccessKey) {
        credentialData.secretAccessKey = secretAccessKey;
      }


      let credentialId: string;

      if (existingCredentialId) {
        // Update existing credential
        const response = await fetch(`/api/credential/${existingCredentialId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            data: credentialData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update credential");
        }

        credentialId = existingCredentialId;
      } else {
        // Create new credential
        if (!secretAccessKey) {
          alert("Secret Access Key is required for new credentials");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/credential", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type: credentialType,
            data: credentialData,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create credential");
        }

        const result = await response.json();
        credentialId = result.credential.id;
      }

      onSave(credentialId);
      onClose();
    } catch (error) {
      console.error("Failed to save credential:", error);
      alert("Failed to save credential. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-background">
              <Key className="h-5 w-5" />
            </div>
            <DialogTitle>
              {existingCredentialId ? "Edit" : "Create"}{" "}
              {storageType === "s3" ? "S3" : "R2"} Credential
            </DialogTitle>
          </div>
        </DialogHeader>

        {loadingExisting ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="credential-name">Name</Label>
              <Input
                id="credential-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`My ${storageType === "s3" ? "S3" : "R2"} Credentials`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credential-endpoint">Endpoint URL</Label>
              <Input
                id="credential-endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder={
                  storageType === "s3"
                    ? "https://s3.amazonaws.com"
                    : "https://[account-id].r2.cloudflarestorage.com"
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credential-access-key">Access Key ID</Label>
              <Input
                id="credential-access-key"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="AKIA..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credential-secret-key">
                Secret Access Key {existingCredentialId && "(leave blank to keep current)"}
              </Label>
              <Input
                id="credential-secret-key"
                type="password"
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder={existingCredentialId ? "••••••••••••••••" : "Secret key"}
              />
            </div>

          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || loadingExisting}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingCredentialId ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
