import { Component } from 'react';

/** Last-resort screen so an unexpected runtime error never leaves a blank white page. */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div dir="rtl" className="min-h-[100vh] flex items-center justify-center bg-tertiary-100 px-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-secondary-400" aria-hidden />
          <h1 className="font-display text-xl font-bold text-primary-600">حدث خطأ غير متوقع</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            نعتذر عن ذلك. أعد تحميل الصفحة، وإذا تكرر الأمر افتح الرابط في متصفح الهاتف.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary rounded-full">
              إعادة تحميل الصفحة
            </button>
            <a href="/" className="text-sm font-medium text-primary-600 underline underline-offset-4">
              العودة للرئيسية
            </a>
          </div>
        </div>
      </div>
    );
  }
}
