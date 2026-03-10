import { Database, Radio, TriangleAlert } from "lucide-react";

import { PublicSite } from "@/components/public-site";
import { StudioShell } from "@/components/studio-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasConvexConfig } from "@/lib/convex";
import type { StudioBridge } from "@/lib/studio";

function MissingConfiguration({ isStudio }: { isStudio: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="mx-auto max-w-2xl border-0">
        <CardHeader className="space-y-4">
          <Badge variant="warning" className="w-fit gap-2">
            <TriangleAlert className="h-3.5 w-3.5" />
            Convex setup needed
          </Badge>
          <CardTitle className="text-3xl">Wire the deployment URL before booting this surface</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm text-muted-foreground">
          <p>
            Add <code>VITE_CONVEX_URL</code> to <code>.env.local</code> so the renderer can subscribe to the hosted Convex deployment.
          </p>
          <div className="rounded-[1.6rem] border border-white/40 bg-white/60 p-4">
            <p className="flex items-center gap-2 font-medium text-foreground">
              {isStudio ? <Database className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
              {isStudio ? "Studio mode" : "Site mode"}
            </p>
            <p className="mt-2">
              Use <code>.env.example</code> as the template, then restart the dev server so both the web app and Electron renderer read the same Convex URL.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  const studio = window.studio as StudioBridge | undefined;

  if (!hasConvexConfig) {
    return <MissingConfiguration isStudio={Boolean(studio)} />;
  }

  return studio ? <StudioShell studio={studio} /> : <PublicSite />;
}

export default App;
