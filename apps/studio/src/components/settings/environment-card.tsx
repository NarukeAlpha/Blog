import { useState } from "react";
import { Input } from "@studio/components/ui/input";
import { Button } from "@studio/components/ui/button";
import { Badge } from "@studio/components/ui/badge";
import { ConnectionTest } from "./connection-test";
import { cn } from "@studio/lib/utils";
import type { StudioEnvironment, StudioEnvironmentSettings, SaveStudioEnvironmentSettingsPayload } from "@shared/types";

interface EnvironmentCardProps {
  env: StudioEnvironment;
  settings: StudioEnvironmentSettings;
  isActive: boolean;
  onTestConnection: () => Promise<boolean>;
  onChange: (patch: SaveStudioEnvironmentSettingsPayload) => void;
  onClearKey: () => void;
}

export function EnvironmentCard({ env, settings, isActive, onTestConnection, onChange, onClearKey }: EnvironmentCardProps) {
  const [deployKey, setDeployKey] = useState("");
  const label = env === "dev" ? "Development" : "Production";

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3",
      isActive ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"
    )}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">{label}</h4>
        {isActive && <Badge variant="outline" className="text-[10px]">Active</Badge>}
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Convex URL</span>
          <Input
            placeholder="https://your-deployment.convex.cloud"
            value={settings.convexUrl}
            onChange={(e) => onChange({ convexUrl: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Action URL (Convex Site)</span>
          <Input
            placeholder="https://your-deployment.convex.site"
            value={settings.convexSiteUrl}
            onChange={(e) => onChange({ convexSiteUrl: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Public Site URL</span>
          <Input
            placeholder="https://your-blog.com"
            value={settings.publicSiteUrl}
            onChange={(e) => onChange({ publicSiteUrl: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Studio Write Key</span>
          <div className="flex gap-2">
            {settings.deployKeyConfigured ? (
              <>
                <Input value="••••••••" disabled className="flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={onClearKey}>Clear</Button>
              </>
            ) : (
              <Input
                type="password"
                placeholder="Paste key"
                className="flex-1"
                value={deployKey}
                onChange={(e) => {
                  setDeployKey(e.target.value);
                  onChange({ deployKey: e.target.value });
                }}
              />
            )}
          </div>
        </label>
      </div>

      <ConnectionTest label="connection" onTest={onTestConnection} />
    </div>
  );
}
