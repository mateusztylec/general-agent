import { type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getSkillByNameForUser } from "@general-agent/database/queries/skills";
import { loadSkillFiles } from "@general-agent/agent/skills/filesystem";

// GET /api/skill/[name] - Get skill metadata + all files
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ name: string }> },
) {
	try {
		const session = await auth.api.getSession({
			headers: await headers(),
		});

		if (!session) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		const { name } = await params;

		// Get skill from database (access control)
		const skill = await getSkillByNameForUser(name, session.user.id);

		if (!skill) {
			return new Response(JSON.stringify({ error: "Skill not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Load all files from filesystem
		const files = await loadSkillFiles(name);

		return new Response(
			JSON.stringify({
				skill: {
					id: skill.id,
					name: skill.name,
					description: skill.description,
					createdAt: skill.createdAt,
					updatedAt: skill.updatedAt,
				},
				files,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Failed to get skill:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
