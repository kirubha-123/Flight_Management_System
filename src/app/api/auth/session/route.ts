import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseConfig, publicEnv } from "@/lib/env";
import { cookies as nextCookies } from "next/headers";

export async function GET(request: Request) {
  if (!hasSupabaseConfig) {
    return NextResponse.json({ session: null }, { status: 200 });
  }

  const cookieStore = await nextCookies();

  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set() {
        /* server read-only */
      },
      remove() {
        /* server read-only */
      },
    },
  });

  const { data } = await supabase.auth.getSession();

  return NextResponse.json({ session: data.session ?? null });
}
