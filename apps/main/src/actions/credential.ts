'use server';

import { z } from 'zod';
import { db } from '@general-agent/database/client';
import { credentials } from '@general-agent/database/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import {
  encryptCredentials,
  decryptCredentials,
  CredentialTypeSchema,
} from '@general-agent/encryption/credentials';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

const CreateCredentialSchema = z.object({
  name: z.string().min(1),
  type: CredentialTypeSchema,
  data: z.record(z.string(), z.unknown()),
});

const UpdateCredentialSchema = z.object({
  name: z.string().min(1).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

const TestExistingSchema = z.object({
  bucketName: z.string().min(1),
});

const TestWithoutSaveSchema = z.object({
  type: z.enum(['s3_credentials', 'r2_credentials']),
  data: z.object({
    endpoint: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
  }),
  bucketName: z.string().min(1),
});

async function testS3Connection(
  endpoint: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucketName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new S3Client({
      endpoint,
      region: 'auto',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      const name = (error as { name?: string }).name ?? '';
      if (name === 'NotFound' || name === 'NoSuchBucket') {
        return { success: false, error: `Bucket "${bucketName}" not found` };
      }
      if (name === 'AccessDenied' || name === 'Forbidden') {
        return { success: false, error: 'Access denied - check your credentials' };
      }
      if (name === 'InvalidAccessKeyId') {
        return { success: false, error: 'Invalid Access Key ID' };
      }
      if (name === 'SignatureDoesNotMatch') {
        return { success: false, error: 'Invalid Secret Access Key' };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error' };
  }
}

export async function createCredentialAction(data: {
  name: string;
  type: z.infer<typeof CredentialTypeSchema>;
  data: Record<string, unknown>;
}) {
  const session = await getSession();
  const parsed = CreateCredentialSchema.parse(data);

  const encryptedData = encryptCredentials(parsed.data);

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

  return { credential: newCredential };
}

export async function updateCredentialAction(
  id: string,
  data: { name?: string; data?: Record<string, unknown> }
) {
  const session = await getSession();
  const parsed = UpdateCredentialSchema.parse(data);

  const [existing] = await db
    .select()
    .from(credentials)
    .where(and(eq(credentials.id, id), eq(credentials.userId, session.user.id)));

  if (!existing) throw new Error('Credential not found');

  const updateData: { name?: string; data?: string } = {};

  if (parsed.name) updateData.name = parsed.name;

  if (parsed.data) {
    const existingData = decryptCredentials(existing.data);
    const mergedData = { ...existingData, ...parsed.data };
    updateData.data = encryptCredentials(mergedData);
  }

  const [updated] = await db
    .update(credentials)
    .set(updateData)
    .where(and(eq(credentials.id, id), eq(credentials.userId, session.user.id)))
    .returning({
      id: credentials.id,
      name: credentials.name,
      type: credentials.type,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    });

  return { credential: updated };
}

export async function deleteCredentialAction(id: string) {
  const session = await getSession();

  const result = await db
    .delete(credentials)
    .where(and(eq(credentials.id, id), eq(credentials.userId, session.user.id)))
    .returning({ id: credentials.id });

  if (result.length === 0) throw new Error('Credential not found');

  return { success: true };
}

export async function testCredentialAction(credentialId: string, bucketName: string) {
  const session = await getSession();
  TestExistingSchema.parse({ bucketName });

  const [credential] = await db
    .select()
    .from(credentials)
    .where(
      and(
        eq(credentials.id, credentialId),
        eq(credentials.userId, session.user.id)
      )
    );

  if (!credential) throw new Error('Credential not found');

  if (credential.type !== 's3_credentials' && credential.type !== 'r2_credentials') {
    throw new Error('Connection test is only supported for S3/R2 credentials');
  }

  const credData = decryptCredentials(credential.data) as {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
  };

  return testS3Connection(
    credData.endpoint,
    credData.accessKeyId,
    credData.secretAccessKey,
    bucketName
  );
}

export async function testCredentialWithoutSaveAction(data: {
  type: 's3_credentials' | 'r2_credentials';
  data: { endpoint: string; accessKeyId: string; secretAccessKey: string };
  bucketName: string;
}) {
  await getSession();
  const parsed = TestWithoutSaveSchema.parse(data);

  return testS3Connection(
    parsed.data.endpoint,
    parsed.data.accessKeyId,
    parsed.data.secretAccessKey,
    parsed.bucketName
  );
}
