import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard React Error Boundary implemented as a class component to capture lifecycle errors.
 */
// Fix: Use React.Component explicitly to ensure generic types for props and state are correctly inherited.
export class ErrorBoundary extends React.Component<Props, State> {
  // Fix: Declare and initialize state as a class property to ensure it's correctly recognized by the TypeScript compiler.
  public override state: State = {
    hasError: false,
    error: null
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("System Critical Error:", error, errorInfo);
  }

  render() {
    // Fix: Access hasError through this.state which is now properly typed via inheritance.
    if (this.state.hasError) {
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
                {/* Fix: Safely access error message from state */}
                {this.state.error?.message || "Unknown Error Sequence"}
                {this.state.error?.stack && `\n\n${this.state.error.stack.split('\n')[0]}`}
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

    // Fix: Access children via this.props which is correctly provided by React.Component inheritance.
    return this.props.children;
  }
}
