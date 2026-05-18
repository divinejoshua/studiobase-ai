import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

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

function getLocalAbsoluteUrl(req: Request, localPath: string): string {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}${localPath}`;
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

async function getPublicUrl(request: Request, key: string): Promise<string> {
  // If it's not a local path, return it directly
  if (!key.startsWith("/")) {
    return key;
  }

  // Get absolute URL on local host first
  const localUrl = getLocalAbsoluteUrl(request, key);

  // If we are on localhost/127.0.0.1, we need to upload it to a public temporary hosting
  const urlObj = new URL(localUrl);
  const hostname = urlObj.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.");

  if (isLocalhost) {
    try {
      const localFilePath = path.join(process.cwd(), "public", key);
      const fileBuffer = await readFile(localFilePath);
      const fileName = path.basename(localFilePath);
      const mimeType = getMimeType(localFilePath);

      const blob = new Blob([fileBuffer], { type: mimeType });
      const formData = new FormData();
      formData.append("file", blob, fileName);

      const tmpRes = await fetch("https://tmpfiles.org/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      if (tmpRes.ok) {
        const tmpData = await tmpRes.json();
        const rawUrl = tmpData.data.url;
        // Make it direct download by replacing /tmpfiles.org/ with /tmpfiles.org/dl/
        const directUrl = rawUrl.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
        console.log("Successfully hosted local file on tmpfiles.org for OpenRouter download:", directUrl);
        return directUrl;
      } else {
        console.error("Failed to upload to tmpfiles.org status:", tmpRes.status);
      }
    } catch (err) {
      console.error("Error hosting file on tmpfiles.org:", err);
    }
  }

  return localUrl;
}

export async function POST(request: Request) {
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
    mediaType?: "image" | "video";
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const aspectRatio = body.aspectRatio ?? "1:1";
  const imageSize = body.imageSize ?? "1K";
  const mediaType = body.mediaType ?? "image";
  
  // The frontend now sends the local urls (e.g. /uploads/...) as referenceKeys
  const referenceKeys = Array.isArray(body.referenceKeys)
    ? body.referenceKeys.filter(k => typeof k === "string")
    : [];

  if (!prompt) {
    return Response.json({ error: "Prompt is required" }, { status: 400 });
  }
  if (!ALLOWED_RATIOS.has(aspectRatio)) {
    return Response.json({ error: "Unsupported aspect ratio" }, { status: 400 });
  }
  
  // Only validate image size for images
  if (mediaType === "image" && !ALLOWED_SIZES.has(imageSize)) {
    return Response.json({ error: "Unsupported image size" }, { status: 400 });
  }

  const referenceUrls = await Promise.all(
    referenceKeys.map(key => getPublicUrl(request, key))
  );

  if (mediaType === "video") {
    let frameImages: {
      type: "image_url";
      image_url: { url: string };
      frame_type: "first_frame" | "last_frame";
    }[] | undefined = undefined;
    if (referenceUrls.length > 0) {
      frameImages = [
        {
          type: "image_url",
          image_url: {
            url: referenceUrls[0],
          },
          frame_type: "first_frame",
        },
      ];
    }

    // Enrich prompt for high-quality product insertion
    let enrichedPrompt = prompt;
    if (referenceUrls.length > 0) {
      enrichedPrompt = `You are creating a highly professional, cinematic product commercial advertisement. The attached reference image contains the primary product, which is set as the first frame of this video. Seamlessly integrate this product into the scene, maintaining its exact shape, branding, texture, and visual identity perfectly. Place the product beautifully and organically in the environment described. Animate the surrounding elements dynamically (e.g. realistic camera motion, dramatic studio lighting, particles, shadows, or organic background movement) while keeping the product clear, recognizable, consistent, and highly appealing. Scene description: ${prompt}`;
    } else {
      enrichedPrompt = `A premium, cinematic product commercial advertisement with gorgeous studio lighting, dynamic camera movements, and high-fidelity textures. Prompt details: ${prompt}`;
    }

    const upstream = await fetch(
      "https://openrouter.ai/api/v1/videos",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "bytedance/seedance-2.0-fast",
          prompt: enrichedPrompt,
          aspect_ratio: aspectRatio,
          duration: 15,
          frame_images: frameImages,
        }),
      },
    );

    if (!upstream.ok) {
      const errText = await upstream.text();
      return Response.json(
        { error: `OpenRouter video error: ${errText}` },
        { status: upstream.status },
      );
    }

    const data = await upstream.json();
    
    console.log("=== OpenRouter Video Response ===");
    console.log(JSON.stringify(data, null, 2));
    console.log("=================================");

    if (!data.id) {
      return Response.json(
        { error: "No video job ID returned from model" },
        { status: 502 },
      );
    }

    return Response.json({
      generation: {
        id: data.id,
        mediaType: "video",
        prompt,
        aspectRatio,
        imageUrl: "",
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    });
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
  
  // Log the OpenRouter API response to the terminal
  console.log("=== OpenRouter API Response ===");
  console.log(JSON.stringify(data, null, 2));
  console.log("===============================");

  const modelImageUrl: string | undefined =
    data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

  if (!modelImageUrl) {
    return Response.json(
      { error: "No image returned from model" },
      { status: 502 },
    );
  }

  let imageUrl: string;
  try {
    const { contentType, bytes } = await fetchImageBytes(modelImageUrl);
    const extension = EXTENSION_BY_MIME[contentType] ?? "png";
    const filename = `${crypto.randomUUID()}.${extension}`;
    
    const generationsDir = path.join(process.cwd(), "public", "generations");
    await mkdir(generationsDir, { recursive: true });
    
    const filePath = path.join(generationsDir, filename);
    await writeFile(filePath, Buffer.from(bytes));
    
    imageUrl = `/generations/${filename}`;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to store generated image";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({
    generation: {
      id: crypto.randomUUID(),
      mediaType: "image",
      prompt,
      aspectRatio,
      imageSize,
      imageUrl,
      createdAt: new Date().toISOString(),
    },
  });
}
