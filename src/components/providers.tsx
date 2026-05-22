"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function AuthSyncBridge() {
  const setSession = useUserStore((state) => state.setSession);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.subscription.unsubscribe();
  }, [setSession]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthSyncBridge />
      {children}
      <Toaster richColors position="top-right" />
    </>
  );
}
