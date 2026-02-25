/**
 * Pre-built skills available from the Anthropic skills repository
 * These are fetched via `npx @anthropic-ai/skills add <skill-name>` during sandbox initialization
 */

export interface PrebuiltSkill {
  name: string;
  description: string;
  source: string;
}

/**
 * List of pre-built skills from the Anthropic skills repository
 * Reference: https://github.com/anthropics/anthropic-skills
 */
export function getPrebuiltSkill(name: string): PrebuiltSkill | undefined {
  return PREBUILT_SKILLS.find((skill) => skill.name === name);
}

export const PREBUILT_SKILLS: PrebuiltSkill[] = [
  {
    name: "git",
    description: "Git repository management and operations",
    source: "@anthropic-ai/skills"
  },
  {
    name: "github",
    description: "GitHub API integration for issues, PRs, and repositories",
    source: "@anthropic-ai/skills"
  },
  {
    name: "npm",
    description: "NPM package management and operations",
    source: "@anthropic-ai/skills"
  },
  {
    name: "python",
    description: "Python development utilities and helpers",
    source: "@anthropic-ai/skills"
  },
  {
    name: "docker",
    description: "Docker container management and operations",
    source: "@anthropic-ai/skills"
  },
  {
    name: "kubernetes",
    description: "Kubernetes cluster management",
    source: "@anthropic-ai/skills"
  },
  {
    name: "aws",
    description: "AWS cloud services integration",
    source: "@anthropic-ai/skills"
  },
  {
    name: "terraform",
    description: "Infrastructure as Code with Terraform",
    source: "@anthropic-ai/skills"
  }
];
