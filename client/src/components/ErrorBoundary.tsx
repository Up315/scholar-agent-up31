import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCcw, Home, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
          <div className="w-full max-w-lg">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 text-white">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8" />
                  <div>
                    <h2 className="text-xl font-bold">出现了一些问题</h2>
                    <p className="text-white/80 text-sm mt-1">应用程序遇到了意外错误</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {isDev && this.state.error && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-slate-600 mb-2">
                      <Bug className="w-4 h-4" />
                      <span className="text-sm font-medium">错误详情</span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 overflow-auto max-h-48">
                      <pre className="text-xs text-red-600 whitespace-pre-wrap break-all">
                        {this.state.error.message}
                      </pre>
                    </div>
                  </div>
                )}

                <p className="text-slate-600 mb-6">
                  请尝试刷新页面或返回首页。如果问题持续存在，请联系技术支持。
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={this.handleReload}
                    className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                  >
                    <RotateCcw className="w-4 h-4" />
                    刷新页面
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1 gap-2"
                  >
                    <Home className="w-4 h-4" />
                    返回首页
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-center text-slate-400 text-sm mt-4">
              Scholar Agent • 错误已记录
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
