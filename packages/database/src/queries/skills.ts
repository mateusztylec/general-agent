import { eq, and } from "drizzle-orm";
import { db } from "../client";
import { customSkills } from "../schema";

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
		.insert(customSkills)
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
	return await db.query.customSkills.findFirst({
		where: eq(customSkills.name, name),
	});
}

/**
 * Get a skill by name for a specific user (for access control)
 */
export async function getSkillByNameForUser(name: string, userId: string) {
	return await db.query.customSkills.findFirst({
		where: and(eq(customSkills.name, name), eq(customSkills.userId, userId)),
	});
}

/**
 * List all customSkills
 */
export async function listAllSkills() {
	return await db.query.customSkills.findMany({
		orderBy: (customSkills, { asc }) => [asc(customSkills.name)],
	});
}

/**
 * List customSkills for a specific user
 */
export async function listSkillsForUser(userId: string) {
	return await db.query.customSkills.findMany({
		where: eq(customSkills.userId, userId),
		orderBy: (customSkills, { asc }) => [asc(customSkills.name)],
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
		.update(customSkills)
		.set({
			...input,
			updatedAt: new Date(),
		})
		.where(and(eq(customSkills.name, name), eq(customSkills.userId, userId)))
		.returning();

	return updated;
}

/**
 * Delete a skill
 */
export async function deleteSkill(name: string, userId: string) {
	const [deleted] = await db
		.delete(customSkills)
		.where(and(eq(customSkills.name, name), eq(customSkills.userId, userId)))
		.returning();

	return deleted;
}

/**
 * Get a skill by ID
 */
export async function getSkillById(id: string) {
	return await db.query.customSkills.findFirst({
		where: eq(customSkills.id, id),
	});
}

/**
 * Get multiple skills by IDs
 */
export async function getSkillsByIds(ids: string[]) {
	if (ids.length === 0) return [];

	return await db.query.customSkills.findMany({
		where: (customSkills, { inArray }) => inArray(customSkills.id, ids),
	});
}
