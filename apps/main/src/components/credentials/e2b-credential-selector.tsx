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
import { E2BCredentialDialog } from "@/components/credentials/e2b-credential-dialog";
import { Plus } from "lucide-react";

type Credential = {
  id: string;
  name: string;
  type: string;
};

type E2BCredentialSelectorProps = {
  credentialId?: string;
  onChange: (credentialId: string | undefined) => void;
};

export function E2BCredentialSelector({
  credentialId,
  onChange,
}: E2BCredentialSelectorProps) {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCredentials = () => {
    setLoading(true);
    fetch("/api/credential")
      .then((res) => res.json())
      .then((data) => {
        const allCredentials = data.credentials || [];
        const filtered = allCredentials.filter(
          (cred: Credential) => cred.type === "e2b_api_key"
        );
        setCredentials(filtered);
      })
      .catch((err) => console.error("Failed to fetch credentials:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleCredentialCreated = (newCredentialId: string) => {
    fetch("/api/credential")
      .then((res) => res.json())
      .then((data) => {
        const allCredentials = data.credentials || [];
        const filtered = allCredentials.filter(
          (cred: Credential) => cred.type === "e2b_api_key"
        );
        setCredentials(filtered);
        onChange(newCredentialId);
      })
      .catch((err) => console.error("Failed to refresh credentials:", err));
  };

  const selectedCredential = credentials.find((c) => c.id === credentialId);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading credentials...</div>;
  }

  return (
    <div className="flex gap-2">
      <Select
        value={credentialId || ""}
        onValueChange={(value) => onChange(value || undefined)}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select E2B API key credential">
            {selectedCredential?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {credentials.map((cred) => (
            <SelectItem key={cred.id} value={cred.id}>
              {cred.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setDialogOpen(true)}
        title="Create new E2B credential"
      >
        <Plus className="h-4 w-4" />
      </Button>

      <E2BCredentialDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleCredentialCreated}
      />
    </div>
  );
}
