import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface UsePublishOptions<TResult> {
  successTitle: string;
  errorTitle: string;
  onSuccess?: (result: TResult) => void;
}

export function usePublish<TPayload, TResult>(
  action: (payload: TPayload) => Promise<TResult>,
  options: UsePublishOptions<TResult>
) {
  const [isBusy, setIsBusy] = useState(false);
  const actionRef = useRef(action);
  const optionsRef = useRef(options);
  actionRef.current = action;
  optionsRef.current = options;

  const execute = useCallback(async (payload: TPayload) => {
    setIsBusy(true);
    try {
      const result = await actionRef.current(payload);
      toast.success(optionsRef.current.successTitle);
      optionsRef.current.onSuccess?.(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(optionsRef.current.errorTitle, { description: message });
      return null;
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { execute, isBusy };
}
