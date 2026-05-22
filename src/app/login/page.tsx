"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useUserStore } from "@/store/useUserStore";

export default function LoginPage() {
  const router = useRouter();
  const sessionToken = useUserStore((state) => state.sessionToken);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const setSession = useUserStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hasHydrated && sessionToken) {
      router.replace("/search");
    }
  }, [hasHydrated, router, sessionToken]);

  if (hasHydrated && sessionToken) {
    return <main className="flex min-h-screen items-center justify-center px-4 text-sm text-slate-300">Redirecting to your dashboard...</main>;
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (!email.trim() || !password) {
      toast.error("Enter both email and password before signing in.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "Unable to sign in.");
        return;
      }

      // hydrate session from server and update store
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionJson = await sessionRes.json();
        setSession(sessionJson.session ?? null);
      } catch {
        // ignore - still proceed to push
      }

      toast.success("Signed in successfully");
      router.push("/search");
    } catch {
      toast.error("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to manage bookings, seats, and itinerary updates.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={submit}>
            <Input placeholder="Email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input placeholder="Password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-slate-300">
            New here? <Link className="text-sky-300" href="/signup">Create an account</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
