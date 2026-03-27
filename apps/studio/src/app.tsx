import { AppWindow, Database, TriangleAlert } from "lucide-react";

import { StudioShell } from "@studio/components/studio-shell";
import { hasConvexConfig } from "@shared/convex-client";
import type { StudioBridge } from "@shared/types";

function MissingConfiguration() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-foreground">
      <section className="w-full max-w-2xl rounded-[2rem] border border-white/20 bg-black/35 p-8 backdrop-blur-xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">
          <TriangleAlert className="h-3.5 w-3.5" />
          Convex setup needed
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Wire the studio to Convex before publishing</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
          Add <code>VITE_CONVEX_URL</code> to <code>.env.local</code>, then restart the studio dev server so the renderer can subscribe to the hosted deployment.
        </p>
        <div className="mt-6 rounded-[1.5rem] border border-white/15 bg-white/5 p-5 text-sm text-slate-300">
          <p className="flex items-center gap-2 font-medium text-white">
            <Database className="h-4 w-4" />
            Studio renderer
          </p>
          <p className="mt-2">Use <code>.env.example</code> as the template, then restart Electron so both the renderer and main process read the same environment.</p>
        </div>
      </section>
    </main>
  );
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

  if (!hasConvexConfig) {
    return <MissingConfiguration />;
  }

  return <StudioShell studio={studio} />;
}

export default App;
