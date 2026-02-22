import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { listSkillsForUser } from "@general-agent/database/queries/skills";

// GET /api/skill - List all skills for user
export async function GET() {
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

		const skills = await listSkillsForUser(session.user.id);

		return new Response(JSON.stringify({ skills }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to list skills:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
