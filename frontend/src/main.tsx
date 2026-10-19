import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import ErrorBoundary from "./components/ErrorBoundary";
import ShellControls from "./components/ShellControls";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ShellControls />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);