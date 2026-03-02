import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  } : undefined,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the S3 URL (public or presigned URL)
  // If bucket is public, we can use direct URL. Otherwise, we'll use presigned URLs.
  if (process.env.AWS_S3_PUBLIC_URL) {
    return `${process.env.AWS_S3_PUBLIC_URL}/${key}`;
  }
  
  // Generate presigned URL (valid for 7 days - AWS S3 maximum)
  const presignedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 604800 } // 7 days (AWS S3 maximum for presigned URLs)
  );
  
  return presignedUrl;
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  // Extract key from URL if full URL is provided
  const s3Key = key.includes('/') ? key.split('/').pop() || key : key;

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  await s3Client.send(command);
}

/**
 * Get a presigned URL for reading a file (if needed)
 */
export async function getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  // Extract key from URL if full URL is provided
  const s3Key = key.includes('/') ? key.split('/').pop() || key : key;

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Extract S3 object key from a full S3 URL (presigned or public).
 * Returns null if the input is not an http(s) URL.
 */
export function extractS3KeyFromUrl(urlOrKey: string): string | null {
  if (!urlOrKey.startsWith('http://') && !urlOrKey.startsWith('https://')) {
    return null;
  }
  const url = new URL(urlOrKey);
  let s3Key = url.pathname.replace(/^\//, '');
  if (s3Key.startsWith(BUCKET_NAME + '/')) {
    s3Key = s3Key.substring(BUCKET_NAME.length + 1);
  }
  if (!s3Key) {
    const parts = url.pathname.split('/');
    s3Key = parts[parts.length - 1] || urlOrKey;
  }
  return s3Key || null;
}

/**
 * Download a file from S3 and return it as a Buffer.
 * Accepts either an S3 key or a full S3 URL. For URLs we always extract the key
 * and use GetObjectCommand so that expired presigned URLs still work.
 */
export async function downloadFromS3(urlOrKey: string): Promise<Buffer> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  let s3Key: string;
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    const extracted = extractS3KeyFromUrl(urlOrKey);
    if (!extracted) {
      throw new Error(`Could not extract S3 key from URL: ${urlOrKey.substring(0, 100)}`);
    }
    s3Key = extracted;
  } else {
    s3Key = urlOrKey;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];
    if (response.Body) {
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
    }
    return Buffer.concat(chunks);
  } catch (error: any) {
    if (error?.message?.includes('ListBucket')) {
      throw new Error(`File not found in S3 (key: ${s3Key}). ListBucket permission error may indicate missing file or insufficient permissions.`);
    }
    throw error;
  }
}
