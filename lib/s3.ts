import { S3Client } from "@aws-sdk/client-s3";

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client {
  if (cachedClient) return cachedClient;

  const region = process.env.AWS_S3_REGION?.trim();
  const accessKeyId = process.env.AWS_S3_ACCESS;
  const secretAccessKey = process.env.AWS_S3_SECRET;

  if (!region) {
    throw new Error("AWS_S3_REGION is not configured");
  }
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS_S3_ACCESS / AWS_S3_SECRET are not configured");
  }

  cachedClient = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

export function getBucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET_NAME is not configured");
  }
  return bucket;
}
