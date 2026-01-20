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
  
  // Generate presigned URL (valid for 1 year by default)
  const presignedUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 31536000 } // 1 year
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
 * Download a file from S3 and return it as a Buffer
 * Accepts either an S3 key or a full S3 URL (presigned or public)
 */
export async function downloadFromS3(urlOrKey: string): Promise<Buffer> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  // Extract key from URL if full URL is provided
  let s3Key: string;
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    // It's a URL - try to extract the key
    // Presigned URLs have the key in query params or path
    // Public URLs have the key in the path
    try {
      const url = new URL(urlOrKey);
      // Remove leading slash from pathname
      s3Key = url.pathname.replace(/^\//, '');
      // If pathname is empty, try to get from query params (presigned URL)
      if (!s3Key && url.searchParams.has('key')) {
        s3Key = url.searchParams.get('key') || '';
      }
      // If still empty, try to extract from the last part of the URL
      if (!s3Key) {
        const parts = url.pathname.split('/');
        s3Key = parts[parts.length - 1] || urlOrKey;
      }
    } catch {
      // If URL parsing fails, try to extract key from the string
      const parts = urlOrKey.split('/');
      s3Key = parts[parts.length - 1] || urlOrKey;
    }
  } else {
    // It's already a key
    s3Key = urlOrKey;
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  
  // Convert stream to Buffer
  const chunks: Uint8Array[] = [];
  if (response.Body) {
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
  }
  
  return Buffer.concat(chunks);
}
