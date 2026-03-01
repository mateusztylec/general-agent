"use client";

import { useState, useEffect } from "react";
import {
  createCredentialAction,
  updateCredentialAction,
} from "@/actions/credential";
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
import { Box, Loader2 } from "lucide-react";

type E2BCredentialDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentialId: string) => void;
  existingCredentialId?: string;
};

export function E2BCredentialDialog({
  isOpen,
  onClose,
  onSave,
  existingCredentialId,
}: E2BCredentialDialogProps) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (isOpen && existingCredentialId) {
      setLoadingExisting(true);
      fetch(`/api/credential/${existingCredentialId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.credential) {
            setName(data.credential.name);
            setApiKey("");
          }
        })
        .catch((err) => console.error("Failed to load credential:", err))
        .finally(() => setLoadingExisting(false));
    } else if (isOpen) {
      setName("");
      setApiKey("");
    }
  }, [isOpen, existingCredentialId]);

  const handleSave = async () => {
    setLoading(true);

    try {
      let credentialId: string;

      if (existingCredentialId) {
        await updateCredentialAction(existingCredentialId, {
          name,
          ...(apiKey && { data: { apiKey } }),
        });
        credentialId = existingCredentialId;
      } else {
        if (!apiKey) {
          alert("API Key is required");
          setLoading(false);
          return;
        }

        const result = await createCredentialAction({
          name,
          type: "e2b_api_key",
          data: { apiKey },
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
            <div className="p-2 rounded-lg bg-orange-500 text-background">
              <Box className="h-5 w-5" />
            </div>
            <DialogTitle>
              {existingCredentialId ? "Edit" : "Create"} E2B API Key
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
              <Label htmlFor="e2b-credential-name">Name</Label>
              <Input
                id="e2b-credential-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My E2B API Key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="e2b-credential-api-key">
                API Key {existingCredentialId && "(leave blank to keep current)"}
              </Label>
              <Input
                id="e2b-credential-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={existingCredentialId ? "••••••••••••••••" : "e2b_..."}
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
