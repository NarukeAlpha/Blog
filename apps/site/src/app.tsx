import { Radio, TriangleAlert } from "lucide-react";

import { PublicSite } from "@site/components/public-site";
import { hasConvexConfig } from "@shared/convex-client";

function MissingConfiguration() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-foreground">
      <section className="w-full max-w-2xl rounded-[2rem] border border-white/20 bg-black/35 p-8 backdrop-blur-xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-200">
          <TriangleAlert className="h-3.5 w-3.5" />
          Convex setup needed
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Point the site at Convex before serving it</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
          Add <code>VITE_CONVEX_URL</code> to <code>.env.local</code>, then restart the site build or dev server.
        </p>
        <div className="mt-6 rounded-[1.5rem] border border-white/15 bg-white/5 p-5 text-sm text-slate-300">
          <p className="flex items-center gap-2 font-medium text-white">
            <Radio className="h-4 w-4" />
            Website mode
          </p>
          <p className="mt-2">Use <code>.env.example</code> as the template so the public site can subscribe to the hosted deployment.</p>
        </div>
      </section>
    </main>
  );
}

function App() {
  if (!hasConvexConfig) {
    return <MissingConfiguration />;
  }

  return <PublicSite />;
}

export default App;
