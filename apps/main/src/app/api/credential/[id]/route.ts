import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@general-agent/database/client';
import { credentials } from '@general-agent/database/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
  encryptCredentials,
  decryptCredentials,
  CredentialTypeSchema,
} from '@general-agent/encryption/credentials';

const UpdateCredentialSchema = z.object({
  name: z.string().min(1).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

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
  } else if (type === 'openai_api_key' || type === 'anthropic_api_key') {
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

// PATCH /api/credential/[id] - Update credential
export async function PATCH(
  request: NextRequest,
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
    const body = await request.json();
    const parsed = UpdateCredentialSchema.parse(body);

    // Check if credential exists and belongs to user
    const [existing] = await db
      .select()
      .from(credentials)
      .where(and(
        eq(credentials.id, id),
        eq(credentials.userId, session.user.id)
      ));

    if (!existing) {
      return new Response(
        JSON.stringify({ error: 'Credential not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare update data
    const updateData: { name?: string; data?: string } = {};

    if (parsed.name) {
      updateData.name = parsed.name;
    }

    if (parsed.data) {
      // Decrypt existing data
      const existingData = decryptCredentials(existing.data);

      // Merge new data with existing (allows partial updates)
      const mergedData = { ...existingData, ...parsed.data };

      // Re-encrypt
      updateData.data = encryptCredentials(mergedData);
    }

    // Update credential
    const [updated] = await db
      .update(credentials)
      .set(updateData)
      .where(and(
        eq(credentials.id, id),
        eq(credentials.userId, session.user.id)
      ))
      .returning({
        id: credentials.id,
        name: credentials.name,
        type: credentials.type,
        createdAt: credentials.createdAt,
        updatedAt: credentials.updatedAt,
      });

    return new Response(
      JSON.stringify({ credential: updated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Failed to update credential:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE /api/credential/[id] - Delete credential
export async function DELETE(
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

    const result = await db
      .delete(credentials)
      .where(and(
        eq(credentials.id, id),
        eq(credentials.userId, session.user.id)
      ))
      .returning({ id: credentials.id });

    if (result.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Credential not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Failed to delete credential:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
