import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from './logger';
import { Readable } from 'stream';

// ============================================
// S3 / MinIO Storage Service
// ============================================

const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET = env.S3_BUCKET;

export interface UploadOptions {
  key: string;
  body: Buffer | Readable | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  size?: number;
}

/**
 * Upload a file to S3/MinIO
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { key, body, contentType, metadata } = options;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
      Metadata: metadata,
    }),
  );

  logger.info(`[S3] Uploaded: ${key}`);
  return {
    key,
    url: `${env.S3_ENDPOINT}/${BUCKET}/${key}`,
  };
}

/**
 * Download a file from S3/MinIO as Buffer
 */
export async function downloadFile(key: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );

  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Download file as a readable stream
 */
export async function downloadFileStream(key: string): Promise<Readable> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
  return response.Body as Readable;
}

/**
 * Generate a pre-signed URL for temporary access
 */
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generate a pre-signed upload URL
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from S3/MinIO
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
  logger.info(`[S3] Deleted: ${key}`);
}

/**
 * Check if a file exists
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * List files by prefix
 */
export async function listFiles(prefix: string, maxKeys = 100): Promise<string[]> {
  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      MaxKeys: maxKeys,
    }),
  );
  return (response.Contents || []).map((obj) => obj.Key!).filter(Boolean);
}

/**
 * Upload a report PDF/HTML to S3
 */
export async function uploadReport(
  orgId: string,
  scanId: string,
  format: string,
  data: Buffer | string,
): Promise<UploadResult> {
  const ext = format === 'pdf' ? 'pdf' : format === 'html' ? 'html' : format;
  const key = `reports/${orgId}/${scanId}/report-${Date.now()}.${ext}`;
  const contentType =
    format === 'pdf'
      ? 'application/pdf'
      : format === 'html'
        ? 'text/html'
        : format === 'json'
          ? 'application/json'
          : 'application/octet-stream';

  return uploadFile({ key, body: data instanceof Buffer ? data : Buffer.from(data), contentType });
}

/**
 * Upload user avatar
 */
export async function uploadAvatar(
  userId: string,
  data: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg';
  const key = `avatars/${userId}/avatar-${Date.now()}.${ext}`;
  return uploadFile({ key, body: data, contentType });
}

/**
 * Upload scan export / SARIF file
 */
export async function uploadScanExport(
  orgId: string,
  scanId: string,
  format: string,
  data: Buffer | string,
): Promise<UploadResult> {
  const key = `exports/${orgId}/${scanId}/export-${Date.now()}.${format}`;
  return uploadFile({
    key,
    body: data instanceof Buffer ? data : Buffer.from(data),
    contentType: format === 'json' ? 'application/json' : 'application/octet-stream',
  });
}

export { s3Client, BUCKET };
