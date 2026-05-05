import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ALLOWED_REFERENCE_MIME_TYPES,
  PRESIGNED_URL_TTL_SECONDS,
  S3_USER_UPLOAD_PREFIX,
} from "@/lib/constants";
import { getBucketName, getS3Client } from "@/lib/s3";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: Request) {
  let body: { contentType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentType = body.contentType;
  if (!contentType || !ALLOWED_REFERENCE_MIME_TYPES.includes(contentType)) {
    return Response.json(
      { error: "Unsupported content type" },
      { status: 400 },
    );
  }

  const extension = EXTENSION_BY_MIME[contentType];
  const key = `${S3_USER_UPLOAD_PREFIX}/${crypto.randomUUID()}.${extension}`;

  try {
    const client = getS3Client();
    const bucket = getBucketName();

    const [uploadUrl, viewUrl] = await Promise.all([
      getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: PRESIGNED_URL_TTL_SECONDS },
      ),
      getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: PRESIGNED_URL_TTL_SECONDS },
      ),
    ]);

    return Response.json({ uploadUrl, viewUrl, key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sign URL";
    return Response.json({ error: message }, { status: 500 });
  }
}
