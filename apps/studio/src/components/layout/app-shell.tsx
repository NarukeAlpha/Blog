import type { ReactNode } from "react";
import { Titlebar } from "./titlebar";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-transparent text-foreground">
      <div className="stardust-overlay pointer-events-none fixed inset-0 z-[-1]" />
      <Titlebar />
      <Sidebar />
      <main className="titlebar-no-drag flex-1 overflow-y-auto px-6 pb-6 pt-14">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}
