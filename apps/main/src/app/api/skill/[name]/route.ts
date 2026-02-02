import { type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
	getSkillByNameForUser,
	updateSkill as dbUpdateSkill,
	deleteSkill as dbDeleteSkill,
} from "@general-agent/database/queries/skills";
import {
	loadSkillFiles,
	saveSkillFiles,
	deleteSkill as fsDeleteSkill,
} from "@general-agent/agent/skills/filesystem";

const UpdateSkillSchema = z.object({
	description: z.string().optional(),
	files: z.record(z.string(), z.string()).optional(),
});

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

// PUT /api/skill/[name] - Update skill (metadata and/or files)
export async function PUT(
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

		// Check ownership
		const skill = await getSkillByNameForUser(name, session.user.id);

		if (!skill) {
			return new Response(JSON.stringify({ error: "Skill not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = await request.json();
		const parsed = UpdateSkillSchema.parse(body);

		// Update metadata if provided
		if (parsed.description !== undefined) {
			await dbUpdateSkill(name, session.user.id, {
				description: parsed.description,
			});
		}

		// Update files if provided
		if (parsed.files) {
			await saveSkillFiles(name, parsed.files);
		}

		// Return updated skill
		const updatedSkill = await getSkillByNameForUser(name, session.user.id);
		const files = await loadSkillFiles(name);

		return new Response(
			JSON.stringify({
				skill: updatedSkill,
				files,
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return new Response(
				JSON.stringify({ error: "Invalid request", details: error.issues }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		console.error("Failed to update skill:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

// DELETE /api/skill/[name] - Delete skill
export async function DELETE(
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

		// Check ownership
		const skill = await getSkillByNameForUser(name, session.user.id);

		if (!skill) {
			return new Response(JSON.stringify({ error: "Skill not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Delete from filesystem
		await fsDeleteSkill(name);

		// Delete from database
		await dbDeleteSkill(name, session.user.id);

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		console.error("Failed to delete skill:", error);
		return new Response(JSON.stringify({ error: "Internal server error" }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}
