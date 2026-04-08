import { useLocation } from "wouter";
import { cn } from "@studio/lib/utils";
import { useStudio } from "@studio/providers/studio-context";

interface Chip {
  label: string;
  ok: boolean;
  configured: boolean;
}

export function HealthStrip() {
  const { status } = useStudio();
  const [, setLocation] = useLocation();

  const chips: Chip[] = [
    { label: "Convex", ok: status.convexReachable, configured: status.convexConfigured },
    { label: "Auth", ok: status.deployKeyConfigured, configured: status.deployKeyConfigured },
    { label: "OpenCode", ok: status.opencodeReady, configured: status.opencodeConfigured },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
            chip.ok
              ? "border-success/20 bg-success/8 text-success"
              : chip.configured
                ? "border-warning/20 bg-warning/8 text-warning"
                : "border-border bg-muted/50 text-muted-foreground",
            "hover:opacity-80"
          )}
          onClick={() => setLocation("/settings")}
        >
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            chip.ok ? "bg-success" : chip.configured ? "bg-warning" : "bg-muted-foreground/50"
          )} />
          {chip.label}
        </button>
      ))}
    </div>
  );
}
