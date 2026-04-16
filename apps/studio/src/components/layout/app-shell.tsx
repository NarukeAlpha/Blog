import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { cn } from "@studio/lib/utils";
import { Titlebar } from "./titlebar";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isPostRoute = location === "/post";

  return (
    <div className="flex h-screen overflow-hidden bg-transparent text-foreground">
      <div className="stardust-overlay pointer-events-none fixed inset-0 z-[-1]" />
      <Titlebar />
      <Sidebar />
      <main className="titlebar-no-drag flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6 pt-14">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            isPostRoute ? "w-full max-w-none" : "mx-auto w-full max-w-6xl"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
