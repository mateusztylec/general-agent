"use client";

import { useEffect, useState } from "react";
import { Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Skill = {
  id: string;
  name: string;
  description: string | null;
};

type SkillsTabProps = {
  selectedSkillIds: string[];
  onChange: (skillIds: string[]) => void;
};

export function SkillsTab({ selectedSkillIds, onChange }: SkillsTabProps) {
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/skill")
      .then((res) => res.json())
      .then((data) => {
        setAllSkills(data.skills || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to load skills:", error);
        setLoading(false);
      });
  }, []);

  const toggleSkill = (skillId: string) => {
    if (selectedSkillIds.includes(skillId)) {
      onChange(selectedSkillIds.filter((id) => id !== skillId));
    } else {
      onChange([...selectedSkillIds, skillId]);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading skills...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Skills</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {selectedSkillIds.length} / {allSkills.length} skills enabled
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/skills">
            <Plus className="h-4 w-4 mr-2" />
            Manage Skills
          </Link>
        </Button>
      </div>

      {/* Skills Grid */}
      {allSkills.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            No skills created yet
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
          {allSkills.map((skill) => {
            const isSelected = selectedSkillIds.includes(skill.id);

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
                    onClick={() => toggleSkill(skill.id)}
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
  );
}
