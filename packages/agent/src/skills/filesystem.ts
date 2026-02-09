import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname, relative } from "node:path";

/**
 * Directory for CUSTOM user-created skills only
 * Pre-built skills (e.g., from anthropics/skills) are NOT stored here
 * They are fetched via `npx skills add` during sandbox spawn
 */
const CUSTOM_CUSTOM_SKILLS_DIR = process.env.CUSTOM_SKILLS_DIR || "/app/data/skills";

/**
 * Name validation pattern: lowercase alphanumeric with hyphens
 * Examples: git-helper, python-formatter, api-client-v2
 */
export const SKILL_NAME_PATTERN = /^[a-z0-9-]+$/;

/**
 * Validate skill name format
 */
export function validateSkillName(name: string): void {
  if (!SKILL_NAME_PATTERN.test(name)) {
    throw new Error(
      "Skill name must be lowercase alphanumeric with hyphens only",
    );
  }
  if (name.length < 3 || name.length > 50) {
    throw new Error("Skill name must be 3-50 characters");
  }
}

/**
 * Get the full path to a skill directory
 */
export function getSkillPath(skillName: string): string {
  return join(CUSTOM_SKILLS_DIR, skillName);
}

/**
 * List all files in a skill directory (recursive)
 * Returns relative paths like: ["README.md", "src/main.py", "src/utils.py"]
 */
export async function listSkillFiles(skillName: string): Promise<string[]> {
  const skillPath = getSkillPath(skillName);
  return await readDirRecursive(skillPath, skillPath);
}

/**
 * Read a single file from a skill
 */
export async function readSkillFile(
  skillName: string,
  filepath: string,
): Promise<string> {
  const fullPath = join(getSkillPath(skillName), filepath);
  return await readFile(fullPath, "utf-8");
}

/**
 * Write/update a file in a skill
 * Creates parent directories if needed
 */
export async function writeSkillFile(
  skillName: string,
  filepath: string,
  content: string,
): Promise<void> {
  const fullPath = join(getSkillPath(skillName), filepath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, "utf-8");
}

/**
 * Delete a single file from a skill
 */
export async function deleteSkillFile(
  skillName: string,
  filepath: string,
): Promise<void> {
  const fullPath = join(getSkillPath(skillName), filepath);
  await rm(fullPath);
}

/**
 * Delete an entire skill directory
 */
export async function deleteSkill(skillName: string): Promise<void> {
  const skillPath = getSkillPath(skillName);
  await rm(skillPath, { recursive: true, force: true });
}

/**
 * Create a new skill with a default README.md
 */
export async function createSkill(
  skillName: string,
  description?: string,
): Promise<void> {
  validateSkillName(skillName);

  const skillPath = getSkillPath(skillName);
  await mkdir(skillPath, { recursive: true });

  // Create default README.md
  const readmeContent = `# ${skillName}

${description || "A custom skill for OpenCode agents."}

## Usage

This skill will be available to agents configured with it.
`;

  await writeFile(join(skillPath, "README.md"), readmeContent, "utf-8");
}

/**
 * Load all files from a skill into memory
 * Returns a map of filepath -> content
 */
export async function loadSkillFiles(
  skillName: string,
): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  const filePaths = await listSkillFiles(skillName);

  for (const filepath of filePaths) {
    files[filepath] = await readSkillFile(skillName, filepath);
  }

  return files;
}

/**
 * Save multiple files to a skill (batch update)
 * Removes files not in the new files object
 */
export async function saveSkillFiles(
  skillName: string,
  files: Record<string, string>,
): Promise<void> {
  // Get current files
  const currentFiles = await listSkillFiles(skillName);
  const newFilePaths = Object.keys(files);

  // Delete removed files
  for (const oldPath of currentFiles) {
    if (!newFilePaths.includes(oldPath)) {
      await deleteSkillFile(skillName, oldPath);
    }
  }

  // Write/update all new files
  for (const [filepath, content] of Object.entries(files)) {
    await writeSkillFile(skillName, filepath, content);
  }
}

/**
 * Helper: Recursively read directory and return relative paths
 */
async function readDirRecursive(dir: string, base: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await readDirRecursive(fullPath, base);
      files.push(...nested);
    } else {
      // Return path relative to skill directory
      files.push(relative(base, fullPath));
    }
  }

  return files;
}
