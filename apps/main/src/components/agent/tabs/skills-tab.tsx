"use client";

import { useEffect, useState } from "react";
import { Plus, ExternalLink, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PREBUILT_SKILLS } from "@general-agent/agent/skills/prebuilt";
import type { CustomSkill } from "@general-agent/database/schema";

type Skill = Pick<CustomSkill, "id" | "name" | "description">;

type SkillsTabProps = {
  selectedPrebuiltSkills: string[];
  selectedCustomSkillIds: string[];
  onPrebuiltChange: (skillNames: string[]) => void;
  onCustomChange: (skillIds: string[]) => void;
};

export function SkillsTab({
  selectedPrebuiltSkills,
  selectedCustomSkillIds,
  onPrebuiltChange,
  onCustomChange
}: SkillsTabProps) {
  const [customSkills, setCustomSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skill")
      .then((res) => res.json())
      .then((data) => {
        setCustomSkills(data.skills || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load skills:", error);
        setLoading(false);
      });
  }, []);

  const togglePrebuiltSkill = (skillName: string) => {
    if (selectedPrebuiltSkills.includes(skillName)) {
      onPrebuiltChange(selectedPrebuiltSkills.filter((name) => name !== skillName));
    } else {
      onPrebuiltChange([...selectedPrebuiltSkills, skillName]);
    }
  };

  const toggleCustomSkill = (skillId: string) => {
    if (selectedCustomSkillIds.includes(skillId)) {
      onCustomChange(selectedCustomSkillIds.filter((id) => id !== skillId));
    } else {
      onCustomChange([...selectedCustomSkillIds, skillId]);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading skills...
      </div>
    );
  }

  const totalSelected = selectedPrebuiltSkills.length + selectedCustomSkillIds.length;
  const totalAvailable = PREBUILT_SKILLS.length + customSkills.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Skills</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalSelected} / {totalAvailable} skills enabled
          </p>
        </div>
      </div>

      {/* Prebuilt Skills Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Pre-built Skills</h3>
          <span className="text-sm text-muted-foreground">
            ({selectedPrebuiltSkills.length} / {PREBUILT_SKILLS.length})
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {PREBUILT_SKILLS.map((skill) => {
            const isSelected = selectedPrebuiltSkills.includes(skill.name);

            return (
              <button
                key={skill.name}
                onClick={() => togglePrebuiltSkill(skill.name)}
                className={cn(
                  "p-4 border rounded-lg transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "hover:bg-accent hover:border-accent-foreground/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {skill.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {skill.description}
                    </div>
                    <div className="text-xs text-muted-foreground/60 mt-1">
                      {skill.source}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Skills Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Custom Skills</h3>
            <span className="text-sm text-muted-foreground">
              ({selectedCustomSkillIds.length} / {customSkills.length})
            </span>
          </div>
          <Button size="sm" asChild>
            <Link href="/skills">
              <Plus className="h-4 w-4 mr-2" />
              Manage Skills
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading custom skills...
          </div>
        ) : customSkills.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground mb-4">
              No custom skills created yet
            </p>
            <Button asChild>
              <Link href="/skills">
                <Plus className="h-4 w-4 mr-2" />
                Create First Skill
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customSkills.map((skill) => {
              const isSelected = selectedCustomSkillIds.includes(skill.id);

              return (
                <div
                  key={skill.id}
                  className={cn(
                    "p-4 border rounded-lg transition-all group",
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:bg-accent hover:border-accent-foreground/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <button
                      onClick={() => toggleCustomSkill(skill.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="font-medium text-sm truncate">
                        {skill.name}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {skill.description || "No description"}
                      </div>
                    </button>
                    {isSelected && (
                      <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full opacity-0 group-hover:opacity-100 transition-opacity"
                    asChild
                  >
                    <Link href={`/skills/${skill.name}`}>
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Edit Skill
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
