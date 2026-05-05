import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PRESIGNED_URL_TTL_SECONDS,
  S3_GENERATION_PREFIX,
  S3_USER_UPLOAD_PREFIX,
} from "@/lib/constants";
import { getBucketName, getS3Client } from "@/lib/s3";

const ALLOWED_KEY_PREFIXES = [S3_USER_UPLOAD_PREFIX, S3_GENERATION_PREFIX];

export function isAllowedKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    key.length > 0 &&
    !key.includes("..") &&
    ALLOWED_KEY_PREFIXES.some((prefix) => key.startsWith(`${prefix}/`))
  );
}

export async function presignViewUrl(key: string): Promise<string> {
  const client = getS3Client();
  const bucket = getBucketName();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: PRESIGNED_URL_TTL_SECONDS },
  );
}
