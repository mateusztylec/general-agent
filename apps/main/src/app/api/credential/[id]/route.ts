import { NextRequest } from 'next/server';
import { db } from '@general-agent/database/client';
import { credentials } from '@general-agent/database/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { decryptCredentials } from '@general-agent/encryption/credentials';

/**
 * Mask secret fields in credential data
 * Shows accessKeyId but masks secretAccessKey
 */
function maskSecrets(type: string, data: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...data };

  // Mask secret fields based on credential type
  if (type === 's3_credentials' || type === 'r2_credentials' || type === 'aws_credentials') {
    if (masked.secretAccessKey) {
      masked.secretAccessKey = '••••••••••••••••';
    }
    if (masked.sessionToken) {
      masked.sessionToken = '••••••••••••••••';
    }
  } else if (type === 'llm_api_key' || type === 'e2b_api_key') {
    if (masked.apiKey) {
      masked.apiKey = '••••••••••••••••';
    }
  }

  return masked;
}

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

    // Decrypt credential data
    const decryptedData = decryptCredentials(credential.data);

    // Mask secrets before sending to frontend
    const maskedData = maskSecrets(credential.type, decryptedData);

    return new Response(
      JSON.stringify({
        credential: {
          id: credential.id,
          name: credential.name,
          type: credential.type,
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
