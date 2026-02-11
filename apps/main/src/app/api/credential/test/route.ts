import { NextRequest } from 'next/server';
import { z } from 'zod';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const TestCredentialSchema = z.object({
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

// POST /api/credential/test - Test connection without saving credentials
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
    const parsed = TestCredentialSchema.parse(body);

    const result = await testS3Connection(
      parsed.data.endpoint,
      parsed.data.accessKeyId,
      parsed.data.secretAccessKey,
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
