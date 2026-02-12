import { Component } from "react";

/** Catches render errors and shows a message instead of a blank page */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: "1rem 1.5rem",
          fontFamily: "system-ui, sans-serif",
          maxWidth: "600px",
          margin: "2rem auto",
          border: "1px solid #f87171",
          borderRadius: "8px",
          backgroundColor: "#fef2f2",
          color: "#991b1b",
        }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem" }}>Something went wrong</h2>
          <pre style={{ margin: 0, fontSize: "0.875rem", whiteSpace: "pre-wrap", overflow: "auto" }}>
            {this.state.error != null && this.state.error.message != null ? this.state.error.message : String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
