import React from "react";
import ReactDOM from "react-dom/client";
import "../index.css";
import { GameApp } from "./GameApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GameApp />
  </React.StrictMode>
);
