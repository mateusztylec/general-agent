import { NextRequest } from 'next/server';
import { db } from '@general-agent/database/client';
import { credentials } from '@general-agent/database/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  decryptCredentials,
  maskCredentialSecrets,
  type CredentialType,
} from '@general-agent/encryption/credentials';

// GET /api/credential/[id] - Get credential with masked secrets
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = await params;

    const [credential] = await db
      .select()
      .from(credentials)
      .where(and(
        eq(credentials.id, id),
        eq(credentials.userId, session.user.id)
      ));

    if (!credential) {
      return new Response(
        JSON.stringify({ error: 'Credential not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const decryptedData = decryptCredentials(credential.data);
    const maskedData = maskCredentialSecrets(
      credential.type as CredentialType,
      credential.provider,
      decryptedData
    );

    return new Response(
      JSON.stringify({
        credential: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
          provider: credential.provider,
          data: maskedData,
          createdAt: credential.createdAt,
          updatedAt: credential.updatedAt,
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to get credential:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
