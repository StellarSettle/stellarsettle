import { Component, type ErrorInfo, type ReactNode } from "react";
import "./error-boundary.css";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard render error:", error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-boundary" role="alert">
        <h1>Something went wrong</h1>
        <p>The dashboard hit an unexpected error. You can try again or reload the page.</p>
        <pre>{this.state.error.message}</pre>
        <div className="error-boundary-actions">
          <button type="button" onClick={this.retry}>Try again</button>
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}
