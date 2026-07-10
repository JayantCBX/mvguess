import React from "react";
import ReactDOM from "react-dom/client";
import "../../src/index.css";
import "./extension.css";
import { ExtensionShell } from "./ExtensionShell";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ExtensionShell surface="popup" />
  </React.StrictMode>
);
