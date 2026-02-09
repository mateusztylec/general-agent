"use client";

import type { AgentConfig } from "@general-agent/agent/config-types";
import { CodeEditorWithLabel } from "@/components/code-editor";

type PromptTabProps = {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
};

export function PromptTab({ config, onChange }: PromptTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">System Prompt</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Define how the agent behaves and responds
        </p>
      </div>

      <CodeEditorWithLabel
        label="System Prompt"
        description="This prompt will be used to guide the agent's behavior and responses."
        value={config.llm.systemPrompt}
        onChange={(value) =>
          onChange({
            ...config,
            llm: { ...config.llm, systemPrompt: value },
          })
        }
        placeholder="You are a helpful AI assistant..."
        minHeight="500px"
        language="markdown"
        wrap
      />
    </div>
  );
}
