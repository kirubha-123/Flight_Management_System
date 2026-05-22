import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseConfig, publicEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!hasSupabaseConfig) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    },
  );
}
