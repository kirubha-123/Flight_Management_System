"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useUserStore } from "@/store/useUserStore";

const navItems = [
  { href: "/search", label: "Search" },
  { href: "/results", label: "Results" },
  { href: "/bookings", label: "My Bookings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useUserStore((state) => state.session);
  const sessionToken = useUserStore((state) => state.sessionToken);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const clearSession = useUserStore((state) => state.clearSession);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!sessionToken) {
      router.replace("/login");
    }
  }, [hasHydrated, router, sessionToken]);

  if (!hasHydrated) {
    return <div className="flex min-h-screen items-center justify-center px-4 text-sm text-slate-300">Loading secured workspace...</div>;
  }

  if (!sessionToken) {
    return <div className="flex min-h-screen items-center justify-center px-4 text-sm text-slate-300">Redirecting to sign in...</div>;
  }

  const handleSignOut = async () => {
    setSigningOut(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      clearSession();
      router.replace("/login");
      setSigningOut(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
      <header className="glass-panel sticky top-4 z-20 mb-6 rounded-[1.75rem] px-4 py-4 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link className="flex items-center gap-3" href="/search">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-400 text-slate-950">
              <Plane className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-white">Flight Management</p>
              <p className="text-xs text-slate-400">PWA booking cockpit</p>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-slate-200">
              <UserRound className="size-4 text-sky-300" />
              <span className="max-w-40 truncate">{session?.user?.email ?? "Signed in"}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={handleSignOut} disabled={signingOut} type="button">
              <UserRound className="size-4" />
              {signingOut ? "Signing out..." : "Sign out"}
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
