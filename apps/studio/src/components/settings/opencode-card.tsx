import { Input } from "@studio/components/ui/input";
import { ConnectionTest } from "./connection-test";

interface OpenCodeCardProps {
  opencodeCommand: string;
  opencodeBaseUrl: string;
  opencodeProviderId: string;
  opencodeModelId: string;
  onChange: (patch: { opencodeCommand?: string; opencodeBaseUrl?: string; opencodeProviderId?: string; opencodeModelId?: string }) => void;
  onTestConnection: () => Promise<boolean>;
}

export function OpenCodeCard({ opencodeCommand, opencodeBaseUrl, opencodeProviderId, opencodeModelId, onChange, onTestConnection }: OpenCodeCardProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
      <h4 className="text-sm font-semibold text-foreground">OpenCode</h4>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Command</span>
          <Input
            placeholder="opencode"
            value={opencodeCommand}
            onChange={(e) => onChange({ opencodeCommand: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Base URL</span>
          <Input
            placeholder="http://127.0.0.1:4096"
            value={opencodeBaseUrl}
            onChange={(e) => onChange({ opencodeBaseUrl: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Provider</span>
          <Input
            placeholder="openai"
            value={opencodeProviderId}
            onChange={(e) => onChange({ opencodeProviderId: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">Model</span>
          <Input
            placeholder="gpt-4"
            value={opencodeModelId}
            onChange={(e) => onChange({ opencodeModelId: e.target.value })}
          />
        </label>
      </div>

      <ConnectionTest label="OpenCode" onTest={onTestConnection} />
    </div>
  );
}
