import { AppWindow } from "lucide-react";

import { StudioShell } from "@studio/components/studio-shell";
import type { StudioBridge } from "@shared/types";

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
          This renderer expects the preload bridge. Use <code>npm run dev:studio</code> or <code>npm start</code> from the workspace root instead of opening the page directly in a browser tab.
        </p>
      </section>
    </main>
  );
}

function App() {
  const studio = window.studio as StudioBridge | undefined;

  if (!studio) {
    return <MissingBridge />;
  }

  return <StudioShell studio={studio} />;
}

export default App;
