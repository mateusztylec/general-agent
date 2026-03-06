"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LLMCredentialDialog } from "@/components/credentials/llm-credential-dialog";
import { Plus } from "lucide-react";

type Credential = {
  id: string;
  name: string;
  type: string;
};

type LLMCredentialSelectorProps = {
  credentialId?: string;
  onChange: (credentialId: string | undefined) => void;
};

export function LLMCredentialSelector({
  credentialId,
  onChange,
}: LLMCredentialSelectorProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch credentials on mount
  useEffect(() => {
    setLoading(true);
    fetch("/api/credential")
      .then((res) => res.json())
      .then((data) => {
        const allCredentials = data.credentials || [];
        // Filter for LLM credentials only
        const filtered = allCredentials.filter(
          (cred: Credential) => cred.type === "llm_credentials"
        );
        setCredentials(filtered);
      })
      .catch((err) => console.error("Failed to fetch credentials:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleCredentialCreated = (newCredentialId: string) => {
    // Refresh credentials list
    fetch("/api/credential")
      .then((res) => res.json())
      .then((data) => {
        const allCredentials = data.credentials || [];
        const filtered = allCredentials.filter(
          (cred: Credential) => cred.type === "llm_credentials"
        );
        setCredentials(filtered);
        // Auto-select the newly created credential
        onChange(newCredentialId);
      })
      .catch((err) => console.error("Failed to refresh credentials:", err));
  };

  const selectedCredential = credentials.find((c) => c.id === credentialId);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading credentials...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={credentialId || ""} onValueChange={(value) => onChange(value || undefined)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a credential">
              {selectedCredential?.name || "Select a credential"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {credentials.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No LLM credentials found
              </div>
            ) : (
              credentials.map((cred) => (
                <SelectItem key={cred.id} value={cred.id}>
                  {cred.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setDialogOpen(true)}
          title="Create new credential"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {!credentialId && (
        <p className="text-xs text-destructive">
          A credential is required. Please select or create one.
        </p>
      )}

      <LLMCredentialDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleCredentialCreated}
      />
    </div>
  );
}
