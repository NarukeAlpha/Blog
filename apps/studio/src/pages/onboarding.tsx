import { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { Input } from "@studio/components/ui/input";
import { Button } from "@studio/components/ui/button";
import { useStudio } from "@studio/providers/studio-context";

const TOTAL_STEPS = 4;

export function OnboardingPage() {
  const { bridge, updateBootstrap, refreshStatus } = useStudio();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [convexUrl, setConvexUrl] = useState("");
  const [convexSiteUrl, setConvexSiteUrl] = useState("");
  const [deployKey, setDeployKey] = useState("");
  const [opencodeBaseUrl, setOpencodeBaseUrl] = useState("http://127.0.0.1:4096");
  const [isTesting, setIsTesting] = useState(false);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const testConnection = useCallback(async () => {
    setIsTesting(true);
    setTestOk(null);
    try {
      const resp = await fetch(convexUrl.replace(/\/$/, "") + "/.well-known/openid-configuration");
      setTestOk(resp.ok);
    } catch {
      setTestOk(false);
    } finally {
      setIsTesting(false);
    }
  }, [convexUrl]);

  const finish = useCallback(async () => {
    setIsSaving(true);
    try {
      const bootstrap = await bridge.saveSettings({
        selectedEnvironment: "dev",
        environments: {
          dev: {
            convexUrl,
            convexSiteUrl,
            deployKey,
          },
        },
        opencodeBaseUrl,
      });
      updateBootstrap(bootstrap);
      void refreshStatus();
      toast.success("Studio configured!");
      setLocation("/");
    } catch (err) {
      toast.error("Setup failed", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setIsSaving(false);
    }
  }, [bridge, convexUrl, convexSiteUrl, deployKey, opencodeBaseUrl, updateBootstrap, refreshStatus, setLocation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4 fade-up">
            <h1 className="text-3xl font-bold text-foreground">Welcome to Writer Studio</h1>
            <p className="text-muted-foreground">
              This desktop app lets you write blog posts in Markdown, save AI-enriched bookmarks, and publish everything to your Convex-powered site.
            </p>
            <p className="text-sm text-muted-foreground">Let's set up your first environment in about 60 seconds.</p>
            <Button onClick={() => setStep(1)} className="gap-2">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 fade-up">
            <h2 className="text-xl font-semibold text-foreground">Connect to Convex</h2>
            <p className="text-sm text-muted-foreground">Paste your Convex deployment URL. You can find it in the Convex dashboard.</p>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Convex URL</span>
              <Input placeholder="https://your-deployment.convex.cloud" value={convexUrl} onChange={(e) => setConvexUrl(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Convex Site URL (action endpoint)</span>
              <Input placeholder="https://your-deployment.convex.site" value={convexSiteUrl} onChange={(e) => setConvexSiteUrl(e.target.value)} />
            </label>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" size="sm" disabled={!convexUrl || isTesting} onClick={() => void testConnection()}>
                {isTesting ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
                Test connection
              </Button>
              {testOk === true && <span className="flex items-center gap-1 text-xs text-success"><Check className="h-3 w-3" /> Connected</span>}
              {testOk === false && <span className="text-xs text-destructive">Unreachable — check the URL</span>}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button disabled={!convexUrl} onClick={() => setStep(2)} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 fade-up">
            <h2 className="text-xl font-semibold text-foreground">Authenticate</h2>
            <p className="text-sm text-muted-foreground">Paste the studio write key. This key authorises the app to create posts and bookmarks.</p>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">Studio Write Key</span>
              <Input type="password" placeholder="Paste key" value={deployKey} onChange={(e) => setDeployKey(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!deployKey} onClick={() => setStep(3)} className="gap-2">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 fade-up">
            <h2 className="text-xl font-semibold text-foreground">OpenCode (optional)</h2>
            <p className="text-sm text-muted-foreground">If you use OpenCode for bookmark enrichment, set the base URL. Otherwise skip this step.</p>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">OpenCode Base URL</span>
              <Input placeholder="http://127.0.0.1:4096" value={opencodeBaseUrl} onChange={(e) => setOpencodeBaseUrl(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={() => void finish()} disabled={isSaving} className="gap-2">
                {isSaving ? "Saving..." : "Finish setup"}
                {!isSaving && <Check className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
