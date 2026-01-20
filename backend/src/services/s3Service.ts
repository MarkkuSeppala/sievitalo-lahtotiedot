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
 * Download a file from S3 and return it as a Buffer
 * Accepts either an S3 key or a full S3 URL (presigned or public)
 */
export async function downloadFromS3(urlOrKey: string): Promise<Buffer> {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is not set');
  }

  // If it's a presigned URL (contains query params), download directly via HTTP
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    const url = new URL(urlOrKey);
    
    // If it has query params, it's likely a presigned URL - download via HTTP
    if (url.search) {
      try {
        const https = urlOrKey.startsWith('https://') ? require('https') : require('http');
        return new Promise((resolve, reject) => {
          https.get(urlOrKey, (response: any) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download: ${response.statusCode}`));
              return;
            }
            const chunks: Uint8Array[] = [];
            response.on('data', (chunk: Uint8Array) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          }).on('error', reject);
        });
      } catch (error) {
        throw new Error(`Failed to download from presigned URL: ${error}`);
      }
    }
    
    // Public URL - extract key and use GetObjectCommand
    let s3Key = url.pathname.replace(/^\//, '');
    // Remove bucket name from path if present
    if (s3Key.startsWith(BUCKET_NAME + '/')) {
      s3Key = s3Key.substring(BUCKET_NAME.length + 1);
    }
    if (!s3Key) {
      const parts = url.pathname.split('/');
      s3Key = parts[parts.length - 1] || urlOrKey;
    }
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    
    const chunks: Uint8Array[] = [];
    if (response.Body) {
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
    }
    
    return Buffer.concat(chunks);
  } else {
    // It's already a key - use GetObjectCommand directly
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: urlOrKey,
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
      // If error mentions ListBucket, it's likely a permissions issue
      // or the file doesn't exist. Re-throw with clearer message.
      if (error?.message?.includes('ListBucket')) {
        throw new Error(`File not found in S3 (key: ${urlOrKey}). ListBucket permission error may indicate missing file or insufficient permissions.`);
      }
      throw error;
    }
  }
}
