"use client";

import { useState } from "react";
import type { AgentConfig, OpencodeToolsMap } from "@general-agent/agent/config-types";
import { AGENT_TOOL_DEFINITIONS } from "@general-agent/agent/config-types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ToolsTabProps = {
  config: AgentConfig;
  onChange: (config: AgentConfig) => void;
};

// Tool categories
const TOOL_CATEGORIES = {
  Fs: ["read", "write", "edit", "grep", "glob", "list"],
  Runtime: ["bash", "patch"],
  Web: ["webfetch"],
  Interaction: ["question"],
  Tasks: ["todoread", "todowrite"],
  Advanced: ["lsp", "skill"],
} as const;

export function ToolsTab({ config, onChange }: ToolsTabProps) {
  const tools = config.tools || {};

  const enabledCount = Object.values(tools).filter(Boolean).length;
  const totalCount = Object.keys(AGENT_TOOL_DEFINITIONS).length;

  const handleToggle = (toolName: string) => {
    const newTools: OpencodeToolsMap = {
      ...tools,
      [toolName]: !tools[toolName as keyof OpencodeToolsMap],
    };
    onChange({ ...config, tools: newTools });
  };

  const handleEnableAll = () => {
    const newTools: OpencodeToolsMap = {};
    for (const tool of Object.keys(AGENT_TOOL_DEFINITIONS)) {
      newTools[tool as keyof OpencodeToolsMap] = true;
    }
    onChange({ ...config, tools: newTools });
  };

  const handleDisableAll = () => {
    onChange({ ...config, tools: {} });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tool Access</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {enabledCount}/{totalCount} tools enabled
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEnableAll}>
            Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDisableAll}>
            Disable All
          </Button>
        </div>
      </div>

      {/* Tool Categories */}
      {Object.entries(TOOL_CATEGORIES).map(([category, categoryTools]) => {
        const enabledInCategory = categoryTools.filter(
          (tool) => tools[tool as keyof OpencodeToolsMap]
        ).length;

        return (
          <div key={category}>
            <h3 className="text-sm font-medium mb-3">
              {category}{" "}
              <span className="text-muted-foreground">
                {enabledInCategory}/{categoryTools.length}
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryTools.map((toolName) => {
                const tool = AGENT_TOOL_DEFINITIONS[toolName as keyof typeof AGENT_TOOL_DEFINITIONS];
                const isEnabled = tools[toolName as keyof OpencodeToolsMap] || false;

                return (
                  <div
                    key={toolName}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="font-medium text-sm">{tool.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {tool.description}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(toolName)}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        isEnabled ? "bg-primary" : "bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
                          isEnabled ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
