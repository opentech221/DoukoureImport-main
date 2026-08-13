import type { StorageClient as StorageClientType } from "@supabase/storage-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

let cachedClient: StorageClientType | null = null;

export async function getStorageClient(): Promise<StorageClientType> {
  if (cachedClient) return cachedClient;

  const { StorageClient } = await import("@supabase/storage-js");
  cachedClient = new StorageClient(`https://${projectId}.supabase.co/storage/v1`, {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
  });

  return cachedClient;
}
