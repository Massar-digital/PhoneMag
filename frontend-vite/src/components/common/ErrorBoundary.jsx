import React, { Component } from 'react';

// interface ErrorBoundaryProps {
//   children: ReactNode;
//   fallback: ReactNode;
// }

// interface ErrorBoundaryState {
//   hasError;
// }

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Optionally log error
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center text-red-500">Something went wrong.</div>
      );
    }
    return this.props.children;
  }
}
