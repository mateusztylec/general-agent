import type { Database } from "@database/client";
import { credentials } from "@database/schema";
import { eq, and } from "drizzle-orm";

export const getCredentialByIdAndUser = async (
  db: Database,
  credentialId: string,
  userId: string
) => {
  const [credential] = await db
    .select()
    .from(credentials)
    .where(and(
      eq(credentials.id, credentialId),
      eq(credentials.userId, userId)
    ));

  if (!credential) {
    throw new Error(`Credential ${credentialId} not found or unauthorized`);
  }

  return credential;
};
