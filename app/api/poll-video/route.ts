import { writeFile, mkdir } from "fs/promises";
import path from "path";

const EXTENSION_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function GET(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return Response.json({ error: "jobId is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://openrouter.ai/api/v1/videos/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json(
        { error: `OpenRouter status check failed: ${errText}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    const status = data.status;

    if (status === "completed") {
      // Download the video content
      const contentRes = await fetch(
        `https://openrouter.ai/api/v1/videos/${jobId}/content`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (!contentRes.ok) {
        return Response.json(
          { error: "Failed to download video content from OpenRouter" },
          { status: 500 },
        );
      }

      const contentType = contentRes.headers.get("content-type") ?? "video/mp4";
      const extension = EXTENSION_BY_MIME[contentType] ?? "mp4";
      const filename = `${jobId}.${extension}`;

      const generationsDir = path.join(process.cwd(), "public", "generations");
      await mkdir(generationsDir, { recursive: true });

      const filePath = path.join(generationsDir, filename);
      const buffer = Buffer.from(await contentRes.arrayBuffer());
      await writeFile(filePath, buffer);

      const imageUrl = `/generations/${filename}`;

      return Response.json({
        status: "ready",
        imageUrl,
      });
    } else if (status === "failed") {
      return Response.json({
        status: "error",
        error: data.error || "OpenRouter video generation failed",
      });
    }

    // Still pending, processing or queued
    return Response.json({
      status: "pending",
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to poll video status";
    return Response.json({ error: message }, { status: 500 });
  }
}
