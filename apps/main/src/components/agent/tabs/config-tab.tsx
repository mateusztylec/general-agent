"use client";

import type { AgentConfig } from "@general-agent/agent/config-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LLMCredentialSelector } from "@/components/credentials/llm-credential-selector";

type ConfigTabProps = {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
};

const LLM_PROVIDERS = ["openai", "anthropic"] as const;

function stripProviderPrefix(model: string, provider: string): string {
  const prefix = `${provider}/`;
  return model.startsWith(prefix) ? model.slice(prefix.length) : model;
}

export function ConfigTab({ config, onChange }: ConfigTabProps) {
  const provider = config.llm.provider;
  const modelName = stripProviderPrefix(config.llm.model, provider);
  const smallModelName = config.llm.small_model
    ? stripProviderPrefix(config.llm.small_model, provider)
    : "";

  const handleProviderChange = (newProvider: (typeof LLM_PROVIDERS)[number]) => {
    onChange({
      ...config,
      llm: {
        ...config.llm,
        provider: newProvider,
        model: modelName ? `${newProvider}/${modelName}` : "",
        small_model: smallModelName ? `${newProvider}/${smallModelName}` : undefined,
      },
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Configuration</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Basic settings for the agent
        </p>
      </div>

      {/* LLM Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">LLM Settings</h3>

        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {LLM_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <div className="flex items-center gap-0">
            <span className="flex items-center h-9 rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground select-none whitespace-nowrap">
              {provider}/
            </span>
            <Input
              id="model"
              value={modelName}
              onChange={(e) =>
                onChange({
                  ...config,
                  llm: { ...config.llm, model: `${provider}/${e.target.value}` },
                })
              }
              placeholder="claude-sonnet-4-5"
              className="rounded-l-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="small-model">Small Model (Optional)</Label>
          <div className="flex items-center gap-0">
            <span className="flex items-center h-9 rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground select-none whitespace-nowrap">
              {provider}/
            </span>
            <Input
              id="small-model"
              value={smallModelName}
              onChange={(e) =>
                onChange({
                  ...config,
                  llm: {
                    ...config.llm,
                    small_model: e.target.value
                      ? `${provider}/${e.target.value}`
                      : undefined,
                  },
                })
              }
              placeholder="claude-haiku-3-5"
              className="rounded-l-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Faster model for simple operations
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-credential">API Key Credential (Required)</Label>
          <LLMCredentialSelector
            credentialId={config.llm.credentialId}
            onChange={(credentialId) =>
              onChange({
                ...config,
                llm: { ...config.llm, credentialId: credentialId || "" },
              })
            }
          />
          <p className="text-xs text-muted-foreground">
            API keys are stored encrypted in the credential vault
          </p>
        </div>
      </div>

    </div>
  );
}
