import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;
  const { supabase } = await import("./supabaseClient");
  cachedClient = supabase;
  return cachedClient;
}
