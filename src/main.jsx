import React from "react";
import ReactDOM from "react-dom/client";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const rootEl = document.getElementById("root");

function showError(message) {
  if (!rootEl) return;
  rootEl.innerHTML = `<pre style="padding:1rem;font-family:monospace;white-space:pre-wrap;color:#c00;margin:0">${message}</pre>`;
}

async function boot() {
  if (!rootEl) {
    document.body.innerHTML = "<p style='padding:1rem;font-family:sans-serif'>Root element #root not found.</p>";
    return;
  }
  try {
    const { default: App } = await import("./App");
    const root = ReactDOM.createRoot(rootEl);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    const msg = err != null && err.message != null ? err.message : String(err);
    showError(msg + (err != null && err.stack ? "\n\n" + err.stack : ""));
  }
}

boot();
