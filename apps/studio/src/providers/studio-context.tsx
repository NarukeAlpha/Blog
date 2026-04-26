import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { StudioBootstrap, StudioBridge, StudioSettings, StudioStatus } from "@shared/types";

interface StudioContextValue {
  bridge: StudioBridge;
  settings: StudioSettings;
  status: StudioStatus;
  isLoadingStatus: boolean;
  refreshStatus: (silent?: boolean) => Promise<void>;
  updateBootstrap: (next: StudioBootstrap) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

const POLL_INTERVAL_MS = 30_000;

function MissingBridgeScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-foreground">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs uppercase tracking-widest text-primary">
          Electron only
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Open the studio through Electron</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This renderer expects the preload bridge. Use <code className="rounded bg-muted px-1.5 py-0.5 text-xs">npm run dev:studio</code> or the packaged desktop app.
        </p>
      </section>
    </main>
  );
}

function LoadingScreen({ detail }: { detail: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 text-foreground">
      <section className="w-full max-w-xl rounded-2xl border border-border bg-card p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          Booting
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Loading studio</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{detail || "Reading local settings and checking the runtime."}</p>
      </section>
    </main>
  );
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const bridge = window.studio;
  const [bootstrap, setBootstrap] = useState<StudioBootstrap | null>(null);
  const [bootError, setBootError] = useState("");
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const bootstrapRef = useRef(bootstrap);
  bootstrapRef.current = bootstrap;

  const refreshStatus = useCallback(async (silent = true) => {
    if (!bootstrapRef.current) return;
    setIsLoadingStatus(true);
    try {
      const next = await bridge!.getStatus();
      setBootstrap((prev) => prev ? { ...prev, status: next } : prev);
    } catch (err) {
      if (!silent) throw err;
    } finally {
      setIsLoadingStatus(false);
    }
  }, [bridge]);

  const refreshStatusRef = useRef(refreshStatus);
  refreshStatusRef.current = refreshStatus;

  useEffect(() => {
    if (!bridge) return;
    bridge.getBootstrap().then(setBootstrap).catch((err: unknown) => {
      setBootError(err instanceof Error ? err.message : "Failed to boot the studio.");
    });
  }, [bridge]);

  useEffect(() => {
    function doRefresh() {
      void refreshStatusRef.current();
    }

    function startPolling() {
      stopPolling();
      doRefresh();
      pollIntervalRef.current = setInterval(doRefresh, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = undefined;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void bridge?.isWindowFocused().then((focused) => {
          if (focused) startPolling();
        });
      } else {
        stopPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", startPolling);
    window.addEventListener("blur", stopPolling);

    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", startPolling);
      window.removeEventListener("blur", stopPolling);
    };
  }, [bridge]);

  const updateBootstrap = useCallback((next: StudioBootstrap) => {
    setBootstrap(next);
  }, []);

  if (!bridge) return <MissingBridgeScreen />;
  if (!bootstrap) return <LoadingScreen detail={bootError} />;

  return (
    <StudioContext.Provider value={{
      bridge,
      settings: bootstrap.settings,
      status: bootstrap.status,
      isLoadingStatus,
      refreshStatus,
      updateBootstrap,
    }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioProvider");
  return ctx;
}
