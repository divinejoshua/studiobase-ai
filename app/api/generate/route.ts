import { auth } from "@clerk/nextjs/server";

const ALLOWED_RATIOS = new Set(["1:1", "16:9", "9:16"]);
const ALLOWED_SIZES = new Set(["1K", "2K", "4K"]);

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
    referenceUrls?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const aspectRatio = body.aspectRatio ?? "1:1";
  const imageSize = body.imageSize ?? "1K";
  const referenceUrls = Array.isArray(body.referenceUrls)
    ? body.referenceUrls.filter(
        (u): u is string => typeof u === "string" && u.length > 0,
      )
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
  const imageUrl: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!imageUrl) {
    return Response.json(
      { error: "No image returned from model" },
      { status: 502 },
    );
  }

  return Response.json({ imageUrl });
}
