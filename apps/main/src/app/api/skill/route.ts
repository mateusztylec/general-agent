import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
	createSkill as dbCreateSkill,
	listSkillsForUser,
} from "@general-agent/database/queries/skills";
import {
	createSkill as fsCreateSkill,
	validateSkillName,
} from "@general-agent/agent/skills/filesystem";

const CreateSkillSchema = z.object({
	name: z.string().min(3).max(50),
	description: z.string().optional(),
});

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

// POST /api/skill - Create new skill
export async function POST(request: NextRequest) {
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

		const body = await request.json();
		const parsed = CreateSkillSchema.parse(body);

		// Validate skill name format
		try {
			validateSkillName(parsed.name);
		} catch (error) {
			return new Response(
				JSON.stringify({
					error:
						error instanceof Error ? error.message : "Invalid skill name",
				}),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Create skill directory with README.md
		await fsCreateSkill(parsed.name, parsed.description);

		// Create database entry
		const skill = await dbCreateSkill({
			userId: session.user.id,
			name: parsed.name,
			description: parsed.description,
		});

		return new Response(JSON.stringify({ skill }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new Response(
				JSON.stringify({ error: "Invalid request", details: error.issues }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		// Check for unique constraint violation
		if (
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "23505"
		) {
			return new Response(
				JSON.stringify({ error: "Skill name already exists" }),
				{ status: 409, headers: { "Content-Type": "application/json" } },
			);
		}

		console.error("Failed to create skill:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
