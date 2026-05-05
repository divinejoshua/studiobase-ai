import { CopyObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { S3_USER_UPLOAD_PREFIX } from "@/lib/constants";
import { presignViewUrl } from "@/lib/presign";
import { getBucketName, getS3Client } from "@/lib/s3";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { generationId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const generationId = body.generationId;
  if (!generationId) {
    return Response.json(
      { error: "generationId is required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: row, error: rowError } = await supabase
    .from("generations")
    .select("image_key, user_id")
    .eq("id", generationId)
    .single();

  if (rowError || !row) {
    return Response.json({ error: "Generation not found" }, { status: 404 });
  }
  if (row.user_id !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const sourceKey = row.image_key as string;
  const dotIdx = sourceKey.lastIndexOf(".");
  const ext = dotIdx >= 0 ? sourceKey.slice(dotIdx + 1) : "png";
  const newKey = `${S3_USER_UPLOAD_PREFIX}/${crypto.randomUUID()}.${ext}`;

  try {
    const client = getS3Client();
    const bucket = getBucketName();
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: newKey,
        CopySource: encodeURI(`${bucket}/${sourceKey}`),
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to copy image";
    return Response.json({ error: message }, { status: 500 });
  }

  const viewUrl = await presignViewUrl(newKey);
  return Response.json({ key: newKey, viewUrl });
}
