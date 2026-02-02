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

type ConfigTabProps = {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
};

const LLM_PROVIDERS = ["openai", "anthropic", "google"] as const;

export function ConfigTab({ config, onChange }: ConfigTabProps) {
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
          <Select
            value={config.llm.provider}
            onValueChange={(value) =>
              onChange({
                ...config,
                llm: {
                  ...config.llm,
                  provider: value as (typeof LLM_PROVIDERS)[number],
                },
              })
            }
          >
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {LLM_PROVIDERS.map((provider) => (
                <SelectItem key={provider} value={provider}>
                  {provider}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={config.llm.model}
            onChange={(e) =>
              onChange({
                ...config,
                llm: { ...config.llm, model: e.target.value },
              })
            }
            placeholder="claude-sonnet-4-5-20250929"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="small-model">Small Model (Optional)</Label>
          <Input
            id="small-model"
            value={config.llm.small_model || ""}
            onChange={(e) =>
              onChange({
                ...config,
                llm: { ...config.llm, small_model: e.target.value || undefined },
              })
            }
            placeholder="claude-haiku-3-5-20241022"
          />
          <p className="text-xs text-muted-foreground">
            Faster model for simple operations
          </p>
        </div>
      </div>

    </div>
  );
}
