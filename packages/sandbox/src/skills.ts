import type { Sandbox } from "e2b";
import {
	listSkillFiles,
	readSkillFile,
} from "@general-agent/agent/skills/filesystem";
import type { PrebuiltSkill } from "@general-agent/agent/skills/prebuilt";

/**
 * Install pre-built skill from external repository via npx
 * Pre-built skills are fetched on-demand during sandbox spawn (no local storage)
 */
export async function installPrebuiltSkill(
	sandbox: Sandbox,
	skill: PrebuiltSkill,
): Promise<void> {
	console.log(`[Skills] Installing pre-built skill: ${skill.name} from ${skill.source}`);

	const cmd = `npx skills add ${skill.source} --skill ${skill.name} -a opencode -y`;

	try {
		const result = await sandbox.commands.run(cmd, {
			onStdout: (data) => console.log(`[npx] ${data}`),
			onStderr: (data) => console.error(`[npx] ${data}`),
		});
		const exitCode = result.exitCode;

		if (exitCode !== 0) {
			throw new Error(`npx skills add exited with code ${exitCode}`);
		}

		console.log(`[Skills] Successfully installed pre-built skill: ${skill.name}`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`[Skills] Failed to install pre-built skill ${skill.name}:`, errorMessage);
		throw error;
	}
}

/**
 * Upload custom user-created skills to sandbox
 * Custom skills are loaded from local filesystem and uploaded to ~/.opencode/skills/{skill-name}/
 */
export async function uploadCustomSkillsToSandbox(
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

	console.log("[Skills] Finished uploading custom skills");
}
