
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component to catch runtime errors and display a fallback UI.
 * Inherits from React.Component with explicit generic types for props and state.
 */
// Fix: Import Component directly and extend it to ensure inherited members like 'props' and 'state' are correctly recognized by the compiler.
export class ErrorBoundary extends Component<Props, State> {
  // Explicitly defining the constructor and initializing state to ensure proper type resolution.
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to the console for debugging
    console.error("System Critical Error:", error, errorInfo);
  }

  render() {
    // Destructure state and props from this.
    // Fix: Using destructuring from this.state which is correctly inherited.
    const { hasError, error } = this.state;
    // Fix: Accessing children from this.props which is correctly inherited from Component.
    const { children } = this.props;

    if (hasError) {
      return (
        <div className="fixed inset-0 z-[999] bg-[#F8F4EE] flex items-center justify-center p-12 font-sans select-none">
          <div className="bg-white border-4 border-black p-12 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] max-w-2xl w-full animate-in zoom-in-95 flex flex-col gap-8">
            <div className="border-b-8 border-black pb-6">
              <h1 className="text-7xl font-black uppercase tracking-tighter text-[#EF3340] leading-none">
                System<br/>Failure
              </h1>
            </div>
            
            <div className="flex flex-col gap-4">
              <p className="text-xl font-black uppercase text-black tracking-tight">
                A critical runtime error has disrupted the transit network.
              </p>
              <div className="bg-black/5 border-l-4 border-black p-4 font-mono text-[10px] uppercase text-black/70 overflow-auto max-h-32 whitespace-pre-wrap">
                {error?.message || "Unknown Error Sequence"}
                {error?.stack && `\n\n${error.stack.split('\n')[0]}`}
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-6 bg-black text-white text-2xl font-black uppercase tracking-widest hover:bg-[#2ECC71] hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
            >
              System Reboot
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
