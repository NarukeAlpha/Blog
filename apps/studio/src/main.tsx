import React from "react";
import ReactDOM from "react-dom/client";

import App from "@studio/app";
import "@shared/styles/base.css";

document.documentElement.dataset.app = "studio";
document.body.dataset.app = "studio";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
