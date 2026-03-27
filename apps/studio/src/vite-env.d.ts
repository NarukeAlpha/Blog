/// <reference types="vite/client" />

import type { StudioBridge } from "@shared/types";

declare global {
  interface Window {
    studio?: StudioBridge;
  }
}

export {};
