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

type LLMCredentialDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentialId: string) => void;
  existingCredentialId?: string;
};

type LLMCredentialData = {
  apiKey: string;
  organization?: string;  // For OpenAI
  projectId?: string;     // For Google
};

export function LLMCredentialDialog({
  isOpen,
  onClose,
  onSave,
  existingCredentialId,
}: LLMCredentialDialogProps) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [organization, setOrganization] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Load existing credential if editing
  useEffect(() => {
    if (isOpen && existingCredentialId) {
      setLoadingExisting(true);
      fetch(`/api/credential/${existingCredentialId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.credential) {
            setName(data.credential.name);
            const credData = data.credential.data as LLMCredentialData;
            setOrganization(credData.organization || "");
            setProjectId(credData.projectId || "");
            // API key is masked, don't set it
            setApiKey("");
          }
        })
        .catch((err) => console.error("Failed to load credential:", err))
        .finally(() => setLoadingExisting(false));
    } else if (isOpen) {
      // Reset form for new credential
      setName("");
      setApiKey("");
      setOrganization("");
      setProjectId("");
    }
  }, [isOpen, existingCredentialId]);

  const handleSave = async () => {
    setLoading(true);

    try {
      const credentialData: Record<string, unknown> = {};

      // Only include API key if user entered one (for updates, blank means don't change)
      if (apiKey) {
        credentialData.apiKey = apiKey;
      }

      // Add optional fields if provided
      if (organization) {
        credentialData.organization = organization;
      }
      if (projectId) {
        credentialData.projectId = projectId;
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
        if (!apiKey) {
          alert("API Key is required for new credentials");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/credential", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type: "llm_api_key",
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
            <div className="p-2 rounded-lg bg-blue-500 text-background">
              <Key className="h-5 w-5" />
            </div>
            <DialogTitle>
              {existingCredentialId ? "Edit" : "Create"} LLM Credential
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
                placeholder="My LLM API Key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credential-api-key">
                API Key {existingCredentialId && "(leave blank to keep current)"}
              </Label>
              <Input
                id="credential-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={existingCredentialId ? "••••••••••••••••" : "sk-..."}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="credential-organization">Organization (Optional)</Label>
              <Input
                id="credential-organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="For OpenAI: org-..."
              />
              <p className="text-xs text-muted-foreground">
                Only needed for OpenAI
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credential-project-id">Project ID (Optional)</Label>
              <Input
                id="credential-project-id"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="For Google: my-project-id"
              />
              <p className="text-xs text-muted-foreground">
                Only needed for Google
              </p>
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
