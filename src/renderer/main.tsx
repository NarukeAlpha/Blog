import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider } from "convex/react";

import App from "@/app";
import { convexClient } from "@/lib/convex";
import "@/styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {convexClient ? (
      <ConvexProvider client={convexClient}>
        <App />
      </ConvexProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
