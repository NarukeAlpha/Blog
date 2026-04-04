import { useCallback, useEffect, useState } from "react";
import { AppWindow, LoaderCircle } from "lucide-react";

import { StudioShell } from "@studio/components/studio-shell";
import type { StudioBootstrap, StudioBridge } from "@shared/types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong while booting the studio.";
}

function MissingBridge() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-foreground">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/20 bg-black/35 p-8 backdrop-blur-xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
          <AppWindow className="h-3.5 w-3.5" />
          Electron only
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Open the studio through Electron</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          This renderer expects the preload bridge. Use <code>npm run dev:studio</code> or the packaged desktop app instead of opening the page directly in a browser tab.
        </p>
      </section>
    </main>
  );
}

function LoadingShell({ detail }: { detail: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-foreground">
      <section className="w-full max-w-xl rounded-[2rem] border border-white/20 bg-black/35 p-8 backdrop-blur-xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          Booting
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Loading studio settings</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">{detail || "Reading local app settings and checking the desktop runtime."}</p>
      </section>
    </main>
  );
}

function App() {
  const studio = window.studio as StudioBridge | undefined;
  const [bootstrap, setBootstrap] = useState<StudioBootstrap | null>(null);
  const [bootError, setBootError] = useState("");

  const refreshBootstrap = useCallback(async () => {
    if (!studio) {
      return;
    }

    try {
      const next = await studio.getBootstrap();
      setBootstrap(next);
      setBootError("");
    } catch (error) {
      setBootError(getErrorMessage(error));
    }
  }, [studio]);

  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap]);

  if (!studio) {
    return <MissingBridge />;
  }

  if (!bootstrap) {
    return <LoadingShell detail={bootError} />;
  }

  return <StudioShell studio={studio} settings={bootstrap.settings} initialStatus={bootstrap.status} onBootstrapChange={setBootstrap} />;
}

export default App;
