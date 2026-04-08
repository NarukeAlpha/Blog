import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { Button } from "@studio/components/ui/button";
import { cn } from "@studio/lib/utils";

type TestStatus = "idle" | "testing" | "ok" | "fail";

interface ConnectionTestProps {
  label: string;
  onTest: () => Promise<boolean>;
}

export function ConnectionTest({ label, onTest }: ConnectionTestProps) {
  const [status, setStatus] = useState<TestStatus>("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setStatus("testing");
    setMessage("");
    try {
      const ok = await onTest();
      setStatus(ok ? "ok" : "fail");
      setMessage(ok ? "Connected" : "Unreachable");
    } catch (err) {
      setStatus("fail");
      setMessage(err instanceof Error ? err.message : "Test failed");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={status === "testing"} onClick={() => void run()}>
        {status === "testing" ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : null}
        Test {label}
      </Button>
      {status !== "idle" && status !== "testing" && (
        <span className={cn("flex items-center gap-1 text-xs", status === "ok" ? "text-success" : "text-destructive")}>
          {status === "ok" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {message}
        </span>
      )}
    </div>
  );
}
