import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { hasSupabaseConfig, publicEnv } from "@/lib/env";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!hasSupabaseConfig) {
    return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL!, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get() {
        return undefined;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return response;
}