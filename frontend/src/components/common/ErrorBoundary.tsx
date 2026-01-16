import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    section?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component for catching and handling React errors gracefully.
 *
 * Features:
 * - Catches JavaScript errors anywhere in child component tree
 * - Displays user-friendly error message with retry option
 * - Logs errors for debugging
 * - Supports custom fallback UI
 * - Section-specific error messages
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error for debugging
        console.error('ErrorBoundary caught an error:', error);
        console.error('Component stack:', errorInfo.componentStack);

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = (): void => {
        window.location.href = '/';
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const { section = 'this section' } = this.props;
            const { error } = this.state;

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="size-8 text-destructive" />
                        <h2 className="text-xl font-semibold text-foreground">
                            Something went wrong
                        </h2>
                    </div>

                    <p className="text-muted-foreground text-center mb-6 max-w-md">
                        We encountered an unexpected error while loading {section}.
                        This could be a temporary issue.
                    </p>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mb-6 max-w-md">
                            <p className="text-sm text-destructive font-mono">
                                {error.message || 'Unknown error'}
                            </p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={this.handleRetry}
                            variant="default"
                            className="gap-2"
                        >
                            <RefreshCw className="size-4" />
                            Try Again
                        </Button>
                        <Button
                            onClick={this.handleGoHome}
                            variant="outline"
                            className="gap-2"
                        >
                            <Home className="size-4" />
                            Go to Dashboard
                        </Button>
                    </div>

                    {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <details className="mt-6 w-full max-w-2xl">
                            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                Show technical details
                            </summary>
                            <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto text-xs font-mono">
                                {this.state.errorInfo.componentStack}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;


/**
 * Hook-based error boundary wrapper for functional components.
 * Use this when you need to wrap a specific section with error handling.
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    section?: string
): React.FC<P> {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <ErrorBoundary section={section}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}
