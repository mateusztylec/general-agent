import type { Database } from "@database/client";
import { agents, user } from "@database/schema";
import { eq } from "drizzle-orm";

export const getAgentById = async (db: Database, id: string) => {
  const [result] = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      name: agents.name,
      config: agents.config,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(agents)
    .leftJoin(user, eq(agents.userId, user.id))
    .where(eq(agents.id, id));

  return result;
};

export const getAgentsByUserId = async (db: Database, userId: string) => {
  const results = await db
    .select({
      id: agents.id,
      userId: agents.userId,
      name: agents.name,
      config: agents.config,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
    })
    .from(agents)
    .where(eq(agents.userId, userId))
    .orderBy(agents.createdAt);

  return results;
};

export type CreateAgentParams = {
  userId: string;
  name: string;
  config: unknown;
};

export const createAgent = async (db: Database, data: CreateAgentParams) => {
  const [result] = await db
    .insert(agents)
    .values({
      userId: data.userId,
      name: data.name,
      config: data.config,
    })
    .returning({
      id: agents.id,
      userId: agents.userId,
      name: agents.name,
      config: agents.config,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
    });

  return result;
};

export type UpdateAgentParams = {
  id: string;
  name?: string;
  config?: unknown;
};

export const updateAgent = async (db: Database, data: UpdateAgentParams) => {
  const { id, ...updateData } = data;

  const [result] = await db
    .update(agents)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(agents.id, id))
    .returning({
      id: agents.id,
      userId: agents.userId,
      name: agents.name,
      config: agents.config,
      createdAt: agents.createdAt,
      updatedAt: agents.updatedAt,
    });

  return result;
};

export const deleteAgent = async (db: Database, id: string) => {
  await db.delete(agents).where(eq(agents.id, id));

  return { id };
};
