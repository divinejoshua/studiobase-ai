import { PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { S3_GENERATION_PREFIX } from "@/lib/constants";
import { isAllowedKey, presignViewUrl } from "@/lib/presign";
import { getBucketName, getS3Client } from "@/lib/s3";
import { getSupabaseAdmin } from "@/lib/supabase";

const ALLOWED_RATIOS = new Set(["1:1", "16:9", "9:16"]);
const ALLOWED_SIZES = new Set(["1K", "2K", "4K"]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function parseDataUrl(
  url: string,
): { contentType: string; bytes: Uint8Array } | null {
  const match = url.match(/^data:([^;,]+)(;base64)?,(.*)$/);
  if (!match) return null;
  const contentType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const data = match[3];
  const buffer = isBase64
    ? Buffer.from(data, "base64")
    : Buffer.from(decodeURIComponent(data), "utf-8");
  return { contentType, bytes: new Uint8Array(buffer) };
}

async function fetchImageBytes(
  url: string,
): Promise<{ contentType: string; bytes: Uint8Array }> {
  if (url.startsWith("data:")) {
    const parsed = parseDataUrl(url);
    if (!parsed) throw new Error("Invalid data URL returned by model");
    return parsed;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download generated image (${res.status})`);
  const contentType = res.headers.get("content-type") ?? "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { contentType, bytes };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 },
    );
  }

  let body: {
    prompt?: string;
    aspectRatio?: string;
    imageSize?: string;
    referenceKeys?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const aspectRatio = body.aspectRatio ?? "1:1";
  const imageSize = body.imageSize ?? "1K";
  const referenceKeys = Array.isArray(body.referenceKeys)
    ? body.referenceKeys.filter(isAllowedKey)
    : [];

  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }
  if (!ALLOWED_RATIOS.has(aspectRatio)) {
    return Response.json({ error: "Unsupported aspect ratio" }, { status: 400 });
  }
  if (!ALLOWED_SIZES.has(imageSize)) {
    return Response.json({ error: "Unsupported image size" }, { status: 400 });
  }

  const referenceUrls = await Promise.all(referenceKeys.map(presignViewUrl));

  const userContent =
    referenceUrls.length === 0
      ? prompt
      : [
          { type: "text", text: prompt },
          ...referenceUrls.map((url) => ({
            type: "image_url",
            image_url: { url },
          })),
        ];

  const upstream = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
        image_config: {
          aspect_ratio: aspectRatio,
          image_size: imageSize,
        },
      }),
    },
  );

  if (!upstream.ok) {
    const errText = await upstream.text();
    return Response.json(
      { error: `OpenRouter error: ${errText}` },
      { status: upstream.status },
    );
  }

  const data = await upstream.json();
  const modelImageUrl: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!modelImageUrl) {
    return Response.json(
      { error: "No image returned from model" },
      { status: 502 },
    );
  }

  let imageKey: string;
  try {
    const { contentType, bytes } = await fetchImageBytes(modelImageUrl);
    const extension = EXTENSION_BY_MIME[contentType] ?? "png";
    imageKey = `${S3_GENERATION_PREFIX}/${crypto.randomUUID()}.${extension}`;

    const client = getS3Client();
    const bucket = getBucketName();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: imageKey,
        Body: bytes,
        ContentType: contentType,
      }),
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to store generated image";
    return Response.json({ error: message }, { status: 500 });
  }

  const supabase = getSupabaseAdmin();
  const { data: inserted, error: insertError } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      media_type: "image",
      prompt,
      aspect_ratio: aspectRatio,
      image_size: imageSize,
      image_key: imageKey,
      reference_keys: referenceKeys,
    })
    .select(
      "id, media_type, prompt, aspect_ratio, image_size, image_key, reference_keys, created_at",
    )
    .single();

  if (insertError || !inserted) {
    return Response.json(
      { error: insertError?.message ?? "Failed to save generation" },
      { status: 500 },
    );
  }

  const imageUrl = await presignViewUrl(imageKey);

  return Response.json({
    generation: {
      id: inserted.id,
      mediaType: inserted.media_type,
      prompt: inserted.prompt,
      aspectRatio: inserted.aspect_ratio,
      imageSize: inserted.image_size,
      imageUrl,
      createdAt: inserted.created_at,
    },
  });
}
