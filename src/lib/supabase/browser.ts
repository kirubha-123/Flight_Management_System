import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseConfig, publicEnv } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!hasSupabaseConfig) {
    return null;
  }

  return createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
