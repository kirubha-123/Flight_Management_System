import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>You are offline</CardTitle>
          <CardDescription>The app shell is still available. Search results and seat sync resume when the connection returns.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-300">
          Cached pages remain accessible. Install the PWA for a smoother offline experience.
        </CardContent>
      </Card>
    </main>
  );
}
