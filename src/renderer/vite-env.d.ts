/// <reference types="vite/client" />

import type { StudioBridge } from "@/lib/studio";

declare global {
  interface Window {
    studio: StudioBridge;
  }
}

export {};
