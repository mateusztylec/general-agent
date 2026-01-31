import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@general-agent/database/client';
import { credentials } from '@general-agent/database/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  encryptCredentials,
  CredentialTypeSchema,
} from '@general-agent/encryption/credentials';

const CreateCredentialSchema = z.object({
  name: z.string().min(1),
  type: CredentialTypeSchema,
  data: z.record(z.string(), z.unknown()),
});

// GET /api/credential - List all credentials for user
export async function GET() {
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

    const userCredentials = await db
      .select({
        id: credentials.id,
        name: credentials.name,
        type: credentials.type,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      })
      .from(credentials)
      .where(eq(credentials.userId, session.user.id));

    return new Response(
      JSON.stringify({ credentials: userCredentials }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to list credentials:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST /api/credential - Create new credential
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = CreateCredentialSchema.parse(body);

    // Encrypt the credential data
    const encryptedData = encryptCredentials(parsed.data);

    // Insert into database
    const [newCredential] = await db
      .insert(credentials)
      .values({
        userId: session.user.id,
        name: parsed.name,
        type: parsed.type,
        data: encryptedData,
      })
      .returning({
        id: credentials.id,
        name: credentials.name,
        type: credentials.type,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      });

    return new Response(
      JSON.stringify({ credential: newCredential }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Failed to create credential:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
