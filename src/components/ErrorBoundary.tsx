import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Error500 } from './Error500';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught frontend exception:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Error500 
          errorDetails={this.state.error?.stack || this.state.error?.message || "Render compilation failure."} 
          onRetry={() => window.location.reload()} 
        />
      );
    }

    return this.props.children ? this.props.children : null;
  }
}
export default ErrorBoundary;
