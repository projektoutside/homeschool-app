import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to error reporting service in production
        if (import.meta.env.PROD) {
            // In production, you would send this to an error tracking service
            // For now, we just log it
            console.error('Error caught by boundary:', error, errorInfo);
        }
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null
        });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary" role="alert">
                    <div className="error-boundary-content">
                        <h2>Something went wrong</h2>
                        <p>
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <div className="error-boundary-actions">
                            <button onClick={this.handleReset} className="error-btn">
                                Try again
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="error-btn error-btn-secondary"
                            >
                                Go to home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
