import { auth } from "@clerk/nextjs/server";
import { presignViewUrl } from "@/lib/presign";
import { getSupabaseAdmin, type GenerationRow } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("generations")
    .select(
      "id, media_type, prompt, aspect_ratio, image_size, image_key, reference_keys, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Pick<
    GenerationRow,
    | "id"
    | "media_type"
    | "prompt"
    | "aspect_ratio"
    | "image_size"
    | "image_key"
    | "reference_keys"
    | "created_at"
  >[];

  const generations = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      mediaType: row.media_type,
      prompt: row.prompt,
      aspectRatio: row.aspect_ratio,
      imageSize: row.image_size,
      imageUrl: await presignViewUrl(row.image_key),
      createdAt: row.created_at,
    })),
  );

  return Response.json({ generations });
}
