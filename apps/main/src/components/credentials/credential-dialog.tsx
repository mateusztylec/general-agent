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
import { Key, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { CredentialType, CredentialData } from "@general-agent/encryption/credentials";
import type { TestStatus } from "@/types/ui";
import {
  createCredentialAction,
  updateCredentialAction,
  testCredentialAction,
  testCredentialWithoutSaveAction,
} from "@/lib/actions/credential";

type CredentialDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentialId: string) => void;
  storageType: "s3" | "r2";
  existingCredentialId?: string;
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
  const [bucketName, setBucketName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState("");

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
            const credData = data.credential.data as CredentialData["s3_credentials"];
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
      setBucketName("");
      setTestStatus("idle");
      setTestError("");
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
        await updateCredentialAction(existingCredentialId, {
          name,
          data: credentialData,
        });
        credentialId = existingCredentialId;
      } else {
        if (!secretAccessKey) {
          alert("Secret Access Key is required for new credentials");
          setLoading(false);
          return;
        }

        const result = await createCredentialAction({
          name,
          type: credentialType,
          data: credentialData,
        });
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

  const handleTest = async () => {
    setTestStatus("loading");
    setTestError("");

    try {
      let result: { success: boolean; error?: string };

      if (existingCredentialId) {
        result = await testCredentialAction(existingCredentialId, bucketName);
      } else {
        result = await testCredentialWithoutSaveAction({
          type: credentialType,
          data: { endpoint, accessKeyId, secretAccessKey },
          bucketName,
        });
      }

      if (result.success) {
        setTestStatus("success");
      } else {
        setTestStatus("error");
        setTestError(result.error || "Connection failed");
      }
    } catch (error) {
      setTestStatus("error");
      setTestError(error instanceof Error ? error.message : "Connection failed");
    }
  };

  const canTest = existingCredentialId
    ? bucketName.length > 0
    : endpoint.length > 0 && accessKeyId.length > 0 && secretAccessKey.length > 0 && bucketName.length > 0;

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

            <div className="space-y-2">
              <Label htmlFor="credential-bucket-name">
                Bucket Name <span className="text-muted-foreground text-xs">(for connection test)</span>
              </Label>
              <Input
                id="credential-bucket-name"
                value={bucketName}
                onChange={(e) => {
                  setBucketName(e.target.value);
                  setTestStatus("idle");
                }}
                placeholder="my-bucket"
              />
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
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={!canTest || testStatus === "loading" || loadingExisting}
          >
            {testStatus === "loading" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {testStatus === "loading" ? "Testing..." : "Test Connection"}
          </Button>
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
