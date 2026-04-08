import { Toaster } from "sonner";
import type { ReactNode } from "react";

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: "hsl(230 22% 12%)",
            border: "1px solid hsl(230 18% 20%)",
            color: "hsl(220 20% 92%)",
            fontFamily: "inherit",
          },
        }}
        theme="dark"
      />
    </>
  );
}
