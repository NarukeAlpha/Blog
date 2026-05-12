import React from "react";
import ReactDOM from "react-dom/client";

import App from "@home/app";
import "@shared/styles/base.css";
import "@site/components/public-site.css";
import "@home/home-site.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
