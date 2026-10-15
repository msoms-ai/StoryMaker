import React from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full glass-panel p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              حدث خطأ غير متوقع في العرض
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              واجه التطبيق مشكلة بسيطة أثناء تحميل هذه الصفحة. يمكنك العودة إلى الصفحة الرئيسية أو إعادة المحاولة.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
