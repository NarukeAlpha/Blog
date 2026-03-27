import { ConvexReactClient } from "convex/react";

export const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
export const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || "";
export const hasConvexConfig = Boolean(convexUrl);
export const convexClient = hasConvexConfig ? new ConvexReactClient(convexUrl) : null;
