import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("SUPABASE_URL is not configured");
  }
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export type MediaType = "image" | "video" | "audio";

export type GenerationRow = {
  id: string;
  user_id: string;
  media_type: MediaType;
  prompt: string;
  aspect_ratio: string;
  image_size: string;
  image_key: string;
  reference_keys: string[];
  created_at: string;
};
