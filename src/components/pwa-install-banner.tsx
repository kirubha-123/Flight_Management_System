"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!promptEvent) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/90 px-4 py-4 shadow-2xl shadow-slate-950/50 backdrop-blur-xl">
      <div>
        <p className="text-sm font-medium text-white">Install Flight Management</p>
        <p className="text-xs text-slate-400">Get offline access and quicker startup from your home screen.</p>
      </div>
      <Button
        size="sm"
        onClick={async () => {
          await promptEvent.prompt();
          setPromptEvent(null);
        }}
        type="button"
      >
        Install
      </Button>
    </div>
  );
}
