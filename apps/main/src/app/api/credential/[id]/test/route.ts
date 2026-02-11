import { NextRequest } from 'next/server';
import { z } from 'zod';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { db } from '@general-agent/database/client';
import { credentials } from '@general-agent/database/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { decryptCredentials } from '@general-agent/encryption/credentials';

const TestExistingCredentialSchema = z.object({
  bucketName: z.string().min(1),
});

async function testS3Connection(
  endpoint: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucketName: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = new S3Client({
      endpoint,
      region: 'auto',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
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

// POST /api/credential/[id]/test - Test connection for existing saved credential
export async function POST(
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
    const parsed = TestExistingCredentialSchema.parse(body);

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

    if (credential.type !== 's3_credentials' && credential.type !== 'r2_credentials') {
      return new Response(
        JSON.stringify({ error: 'Connection test is only supported for S3/R2 credentials' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const credData = decryptCredentials(credential.data) as {
      endpoint: string;
      accessKeyId: string;
      secretAccessKey: string;
    };

    const result = await testS3Connection(
      credData.endpoint,
      credData.accessKeyId,
      credData.secretAccessKey,
      parsed.bucketName,
    );

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: error.issues }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.error('Failed to test credential:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
