import type PostgrestClientType from "@supabase/postgrest-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

let cachedClient: PostgrestClientType | null = null;

export async function getPostgrestClient(): Promise<PostgrestClientType> {
  if (cachedClient) return cachedClient;

  const { PostgrestClient } = await import("@supabase/postgrest-js");
  cachedClient = new PostgrestClient(`https://${projectId}.supabase.co/rest/v1`, {
    headers: {
      apikey: publicAnonKey,
      Authorization: `Bearer ${publicAnonKey}`,
    },
    schema: "public",
  });

  return cachedClient;
}
