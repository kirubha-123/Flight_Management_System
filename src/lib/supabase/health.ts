import { publicEnv } from "@/lib/env";

export async function checkSupabaseAuthAvailability() {
  if (!publicEnv.NEXT_PUBLIC_SUPABASE_URL || !publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return false;
  }

  try {
    const response = await fetch(`${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      cache: "no-store",
      headers: {
        apikey: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}