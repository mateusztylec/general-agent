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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Key, Loader2 } from "lucide-react";
import type { LLMCredentialPayload, LLMProvider } from "@general-agent/encryption/credentials";
import {
  LLMProviderSchema,
  parseLLMCredentialData,
} from "@general-agent/encryption/credentials";
import {
  createCredentialAction,
  updateCredentialAction,
} from "@/actions/credential";

const LLM_PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

type LLMCredentialDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentialId: string) => void;
  existingCredentialId?: string;
};

export function LLMCredentialDialog({
  isOpen,
  onClose,
  onSave,
  existingCredentialId,
}: LLMCredentialDialogProps) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<LLMProvider>("openai");
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
            const provider = LLMProviderSchema.parse(data.credential.provider);
            const credData = parseLLMCredentialData(provider, data.credential.data);

            setName(data.credential.name);
            setProvider(provider);
            setOrganization(credData.organization ?? "");
            setProjectId(credData.projectId ?? "");
            setApiKey("");
          }
        })
        .catch((err) => console.error("Failed to load credential:", err))
        .finally(() => setLoadingExisting(false));
    } else if (isOpen) {
      setName("");
      setProvider("openai");
      setApiKey("");
      setOrganization("");
      setProjectId("");
    }
  }, [isOpen, existingCredentialId]);

  const handleSave = async () => {
    setLoading(true);

    try {
      const credentialData: Partial<LLMCredentialPayload<LLMProvider>> = {
        ...(apiKey && { apiKey }),
        ...(organization && { organization }),
        ...(projectId && { projectId }),
      };

      let credentialId: string;

      if (existingCredentialId) {
        await updateCredentialAction(existingCredentialId, {
          name,
          data: credentialData,
        });
        credentialId = existingCredentialId;
      } else {
        if (!apiKey) {
          alert("API Key is required for new credentials");
          setLoading(false);
          return;
        }

        const result = await createCredentialAction({
          name,
          type: "llm_credentials",
          provider,
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
              <Label htmlFor="credential-provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as LLMProvider)}
                disabled={!!existingCredentialId}
              >
                <SelectTrigger id="credential-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {existingCredentialId && (
                <p className="text-xs text-muted-foreground">Provider cannot be changed when editing</p>
              )}
            </div>
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
