import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexProvider } from "convex/react";

import App from "@studio/app";
import { convexClient } from "@shared/convex-client";
import "@shared/styles/base.css";

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
