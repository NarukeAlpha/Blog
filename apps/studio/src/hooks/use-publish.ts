import { useCallback, useState } from "react";
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

  const execute = useCallback(async (payload: TPayload) => {
    setIsBusy(true);
    try {
      const result = await action(payload);
      toast.success(options.successTitle);
      options.onSuccess?.(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(options.errorTitle, { description: message });
      return null;
    } finally {
      setIsBusy(false);
    }
  }, [action, options]);

  return { execute, isBusy };
}
