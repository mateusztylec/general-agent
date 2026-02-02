import { eq, and } from "drizzle-orm";
import type { Database } from "../client";
import { db } from "../client";
import { skills, agentSkills } from "../schema";

export interface CreateSkillInput {
	userId: string;
	name: string;
	description?: string;
}

export interface UpdateSkillInput {
	description?: string;
}

/**
 * Create a new skill
 */
export async function createSkill(input: CreateSkillInput) {
	const [skill] = await db
		.insert(skills)
		.values({
			userId: input.userId,
			name: input.name,
			description: input.description,
		})
		.returning();

	return skill;
}

/**
 * Get a skill by name
 */
export async function getSkillByName(name: string) {
	return await db.query.skills.findFirst({
		where: eq(skills.name, name),
	});
}

/**
 * Get a skill by name for a specific user (for access control)
 */
export async function getSkillByNameForUser(name: string, userId: string) {
	return await db.query.skills.findFirst({
		where: and(eq(skills.name, name), eq(skills.userId, userId)),
	});
}

/**
 * List all skills
 */
export async function listAllSkills() {
	return await db.query.skills.findMany({
		orderBy: (skills, { asc }) => [asc(skills.name)],
	});
}

/**
 * List skills for a specific user
 */
export async function listSkillsForUser(userId: string) {
	return await db.query.skills.findMany({
		where: eq(skills.userId, userId),
		orderBy: (skills, { asc }) => [asc(skills.name)],
	});
}

/**
 * Update a skill's metadata
 */
export async function updateSkill(
	name: string,
	userId: string,
	input: UpdateSkillInput,
) {
	const [updated] = await db
		.update(skills)
		.set({
			...input,
			updatedAt: new Date(),
		})
		.where(and(eq(skills.name, name), eq(skills.userId, userId)))
		.returning();

	return updated;
}

/**
 * Delete a skill
 */
export async function deleteSkill(name: string, userId: string) {
	const [deleted] = await db
		.delete(skills)
		.where(and(eq(skills.name, name), eq(skills.userId, userId)))
		.returning();

	return deleted;
}

/**
 * Get skills for an agent
 */
export async function getSkillsForAgent(database: Database, agentId: string) {
	const result = await database
		.select({
			id: skills.id,
			userId: skills.userId,
			name: skills.name,
			description: skills.description,
			createdAt: skills.createdAt,
			updatedAt: skills.updatedAt,
		})
		.from(agentSkills)
		.innerJoin(skills, eq(agentSkills.skillId, skills.id))
		.where(eq(agentSkills.agentId, agentId));

	return result;
}

/**
 * Add a skill to an agent
 */
export async function addSkillToAgent(
	database: Database,
	agentId: string,
	skillId: string,
) {
	await database.insert(agentSkills).values({
		agentId,
		skillId,
	});
}

/**
 * Remove a skill from an agent
 */
export async function removeSkillFromAgent(
	database: Database,
	agentId: string,
	skillId: string,
) {
	await database
		.delete(agentSkills)
		.where(
			and(eq(agentSkills.agentId, agentId), eq(agentSkills.skillId, skillId)),
		);
}

/**
 * Set skills for an agent (replaces all existing skills)
 */
export async function setSkillsForAgent(
	database: Database,
	agentId: string,
	skillIds: string[],
) {
	// Delete all existing skills for this agent
	await database.delete(agentSkills).where(eq(agentSkills.agentId, agentId));

	// Insert new skills
	if (skillIds.length > 0) {
		await database.insert(agentSkills).values(
			skillIds.map((skillId) => ({
				agentId,
				skillId,
			})),
		);
	}
}
