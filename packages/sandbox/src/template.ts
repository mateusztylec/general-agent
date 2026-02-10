import { Template } from "e2b";

/**
 * E2B Sandbox Template with OpenCode pre-installed
 */
export const opencodeTemplate = Template()
	.fromImage("node:22")
	.runCmd("npm install -g opencode-ai@v1.1.56", { user: "root" })
	.runCmd("mkdir -p /home/user/.agents/skills")
	.aptInstall(["s3fs"]);

export const TEMPLATE_ALIAS = "general-agent-opencode";
