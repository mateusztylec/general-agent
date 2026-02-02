import type { Sandbox } from "e2b";
import {
	listSkillFiles,
	readSkillFile,
} from "@general-agent/agent/skills/filesystem";

/**
 * Upload skills to sandbox
 * Skills are loaded from local filesystem and uploaded to ~/.opencode/skills/{skill-name}/
 */
export async function uploadSkillsToSandbox(
	sandbox: Sandbox,
	skillNames: string[],
): Promise<void> {
	if (!skillNames || skillNames.length === 0) {
		console.log("[Skills] No skills to upload");
		return;
	}

	console.log(`[Skills] Uploading ${skillNames.length} skill(s)...`);

	for (const skillName of skillNames) {
		try {
			console.log(`[Skills] Uploading skill: ${skillName}`);

			// List all files in the skill
			const filePaths = await listSkillFiles(skillName);

			if (filePaths.length === 0) {
				console.warn(`[Skills] Skill ${skillName} has no files, skipping`);
				continue;
			}

			// Upload each file to sandbox
			for (const filepath of filePaths) {
				const content = await readSkillFile(skillName, filepath);
				const sandboxPath = `/home/user/.opencode/skills/${skillName}/${filepath}`;

				await sandbox.files.write(sandboxPath, content);
			}

			console.log(
				`[Skills] Successfully uploaded ${filePaths.length} file(s) for ${skillName}`,
			);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(
				`[Skills] Failed to upload skill ${skillName}:`,
				errorMessage,
			);
			// Continue with other skills even if one fails
		}
	}

	console.log("[Skills] Finished uploading skills");
}
