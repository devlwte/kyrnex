import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary capturó un error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-8 select-none">
          <div className="max-w-md w-full dark:bg-kyrn-card bg-white border dark:border-kyrn-border border-slate-200 rounded-2xl p-6 text-center shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold dark:text-white text-slate-900">
                Se produjo un problema al renderizar esta vista
              </h3>
              <p className="text-xs dark:text-slate-400 text-slate-500 mt-1">
                La aplicación protegió la interfaz para evitar el cierre inesperado.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg dark:bg-slate-900 bg-slate-100 font-mono text-[11px] text-red-500 text-left overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-1.5 px-4 py-2 bg-kyrn-blue hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-glow transition-all"
              >
                <RefreshCw size={14} />
                <span>Reintentar</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
