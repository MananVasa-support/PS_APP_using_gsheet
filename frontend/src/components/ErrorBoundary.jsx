import { Component } from 'react';
import { FiAlertTriangle, FiRefreshCw, FiHome } from 'react-icons/fi';

/**
 * Catches render/lazy-load errors anywhere below it and shows a clean themed
 * fallback instead of a blank white screen. Pass `resetKey` (e.g. the current
 * pathname) so the boundary clears itself when the route changes.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, key: props.resetKey };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Clear the error automatically when the route (resetKey) changes.
  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.key) {
      return { hasError: false, error: null, key: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 px-6 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-unproductive/15 text-unproductive">
            <FiAlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-fg-strong">Something went wrong</h1>
          <p className="mt-2 text-sm text-ink-400">
            We hit an unexpected error while loading this page. Try reloading, or head back to your dashboard.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn bg-brand-gradient text-white shadow-glow hover:brightness-110"
            >
              <FiRefreshCw className="h-4 w-4" /> Reload
            </button>
            <a href="/dashboard" className="btn border border-ink-600 text-fg-strong hover:border-brand-500 hover:text-fg-strong">
              <FiHome className="h-4 w-4" /> Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
