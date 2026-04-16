import { FormEvent, useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@studio/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@studio/components/ui/tabs";
import { EnvironmentCard } from "@studio/components/settings/environment-card";
import { OpenCodeCard } from "@studio/components/settings/opencode-card";
import { useStudio } from "@studio/providers/studio-context";
import type { SaveStudioSettingsPayload, StudioEnvironment, SaveStudioEnvironmentSettingsPayload } from "@shared/types";

export function SettingsPage() {
  const { bridge, settings, status, refreshStatus, updateBootstrap } = useStudio();
  const [tab, setTab] = useState("environments");
  const [isSaving, setIsSaving] = useState(false);

  const [selectedEnv, setSelectedEnv] = useState<StudioEnvironment>(settings.selectedEnvironment);
  const [envPatches, setEnvPatches] = useState<Partial<Record<StudioEnvironment, SaveStudioEnvironmentSettingsPayload>>>({});
  const [clearKeys, setClearKeys] = useState<StudioEnvironment[]>([]);
  const [opencodeCommand, setOpencodeCommand] = useState(settings.opencodeCommand);
  const [opencodeBaseUrl, setOpencodeBaseUrl] = useState(settings.opencodeBaseUrl);
  const [opencodeProviderId, setOpencodeProviderId] = useState(settings.opencodeProviderId);
  const [opencodeModelId, setOpencodeModelId] = useState(settings.opencodeModelId);

  const patchEnv = useCallback((env: StudioEnvironment, patch: SaveStudioEnvironmentSettingsPayload) => {
    setEnvPatches((prev) => ({
      ...prev,
      [env]: { ...prev[env], ...patch },
    }));
  }, []);

  const handleClearKey = useCallback((env: StudioEnvironment) => {
    setClearKeys((prev) => (prev.includes(env) ? prev : [...prev, env]));
    toast.info(`${env} deploy key will be cleared on save.`);
  }, []);

  const handleSave = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload: SaveStudioSettingsPayload = {
      selectedEnvironment: selectedEnv,
      environments: Object.keys(envPatches).length ? envPatches : undefined,
      clearDeployKeys: clearKeys.length ? clearKeys : undefined,
      opencodeCommand,
      opencodeBaseUrl,
      opencodeProviderId,
      opencodeModelId,
    };

    try {
      const bootstrap = await bridge.saveSettings(payload);
      updateBootstrap(bootstrap);
      setEnvPatches({});
      setClearKeys([]);
      toast.success("Settings saved");
      void refreshStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save settings.";
      toast.error("Save failed", { description: message });
    } finally {
      setIsSaving(false);
    }
  }, [bridge, selectedEnv, envPatches, clearKeys, opencodeCommand, opencodeBaseUrl, opencodeProviderId, opencodeModelId, updateBootstrap, refreshStatus]);

  const testConvex = useCallback(async () => {
    try {
      const s = await bridge.getStatus();
      return s.convexReachable;
    } catch {
      return false;
    }
  }, [bridge]);

  const testOpencode = useCallback(async () => {
    try {
      const s = await bridge.getStatus();
      return s.opencodeReady;
    } catch {
      return false;
    }
  }, [bridge]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 fade-up">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">Configure environments, keys, and integrations.</p>
      </div>

      <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="environments">Environments</TabsTrigger>
            <TabsTrigger value="opencode">OpenCode</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="environments" className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Active environment:</span>
              {(["dev", "prod"] as const).map((env) => (
                <Button
                  key={env}
                  type="button"
                  variant={selectedEnv === env ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedEnv(env)}
                >
                  {env === "dev" ? "Dev" : "Prod"}
                </Button>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {(["dev", "prod"] as const).map((env) => {
                const merged = {
                  ...settings.environments[env],
                  ...envPatches[env],
                  deployKeyConfigured: clearKeys.includes(env) ? false : settings.environments[env].deployKeyConfigured,
                };
                return (
                  <EnvironmentCard
                    key={env}
                    env={env}
                    settings={merged}
                    isActive={selectedEnv === env}
                    onChange={(patch) => patchEnv(env, patch)}
                    onClearKey={() => handleClearKey(env)}
                    onTestConnection={testConvex}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="opencode" className="max-w-4xl">
            <OpenCodeCard
              opencodeCommand={opencodeCommand}
              opencodeBaseUrl={opencodeBaseUrl}
              opencodeProviderId={opencodeProviderId}
              opencodeModelId={opencodeModelId}
              onChange={(patch) => {
                if (patch.opencodeCommand !== undefined) setOpencodeCommand(patch.opencodeCommand);
                if (patch.opencodeBaseUrl !== undefined) setOpencodeBaseUrl(patch.opencodeBaseUrl);
                if (patch.opencodeProviderId !== undefined) setOpencodeProviderId(patch.opencodeProviderId);
                if (patch.opencodeModelId !== undefined) setOpencodeModelId(patch.opencodeModelId);
              }}
              onTestConnection={testOpencode}
            />
          </TabsContent>

          <TabsContent value="about" className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm space-y-2">
              <p><span className="text-muted-foreground">App path:</span> <code className="text-xs">{status.appPath}</code></p>
              <p><span className="text-muted-foreground">User data:</span> <code className="text-xs">{status.userDataDir}</code></p>
              <p><span className="text-muted-foreground">Thumbnails:</span> <code className="text-xs">{status.thumbnailsDir}</code></p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 mt-6 flex justify-end border-t border-border bg-background pt-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
