"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { AgentConfig } from "@general-agent/agent/config-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolsTab } from "@/components/agent-tabs/tools-tab";
import { SkillsTab } from "@/components/agent-tabs/skills-tab";
import { PromptTab } from "@/components/agent-tabs/prompt-tab";
import { ConfigTab } from "@/components/agent-tabs/config-tab";
import { SandboxTab } from "@/components/agent-tabs/sandbox-tab";
import { cn } from "@/lib/utils";

type Tab = "config" | "tools" | "skills" | "prompt" | "sandbox";

type Skill = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type AgentEditorClientProps = {
  agentId: string;
  agentName: string;
  initialConfig: AgentConfig;
  initialSkills: Skill[];
};

export function AgentEditorClient({
  agentId,
  agentName: initialAgentName,
  initialConfig,
  initialSkills,
}: AgentEditorClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("tools");
  const [agentName, setAgentName] = useState(initialAgentName);
  const [config, setConfig] = useState<AgentConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);

  // Extract prebuilt and custom skills from config
  const selectedPrebuiltSkills = config.skills?.prebuilt || [];
  const selectedCustomSkillIds = config.skills?.custom || [];

  const handlePrebuiltSkillsChange = (skillNames: string[]) => {
    setConfig({
      ...config,
      skills: {
        prebuilt: skillNames,
        custom: config.skills?.custom || [],
      },
    });
  };

  const handleCustomSkillsChange = (skillIds: string[]) => {
    setConfig({
      ...config,
      skills: {
        prebuilt: config.skills?.prebuilt || [],
        custom: skillIds,
      },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save config and name (skills are now in config)
      const configResponse = await fetch(`/api/agent/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, name: agentName }),
      });

      if (!configResponse.ok) {
        const error = await configResponse.json();
        throw new Error(error.error || "Failed to save config");
      }

      toast.success("Saved successfully");
      router.refresh();
    } catch (error) {
      console.error("Save error:", error);
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "config", label: "Config" },
    { id: "tools", label: "Tools" },
    { id: "skills", label: "Skills" },
    { id: "prompt", label: "Prompt" },
    { id: "sandbox", label: "Sandbox" },
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <div className="h-14 border-b bg-background flex items-center justify-between px-4 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <Link href="/" className="hover:text-foreground transition-colors">
              Agents
            </Link>
            <span>/</span>
            <div className="flex items-center gap-2">
              <Label htmlFor="agent-name" className="sr-only">Agent Name</Label>
              <Input
                id="agent-name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="h-7 text-sm font-medium text-foreground max-w-[300px]"
                placeholder="Agent Name"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/agent/${agentId}/chat`}>Chat</Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-background">
        <div className="flex px-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px]",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-5xl mx-auto p-6">
          {activeTab === "config" && (
            <ConfigTab config={config} onChange={setConfig} />
          )}
          {activeTab === "tools" && (
            <ToolsTab config={config} onChange={setConfig} />
          )}
          {activeTab === "skills" && (
            <SkillsTab
              selectedPrebuiltSkills={selectedPrebuiltSkills}
              selectedCustomSkillIds={selectedCustomSkillIds}
              onPrebuiltChange={handlePrebuiltSkillsChange}
              onCustomChange={handleCustomSkillsChange}
            />
          )}
          {activeTab === "prompt" && (
            <PromptTab config={config} onChange={setConfig} />
          )}
          {activeTab === "sandbox" && (
            <SandboxTab config={config} onChange={setConfig} />
          )}
        </div>
      </div>
    </div>
  );
}
