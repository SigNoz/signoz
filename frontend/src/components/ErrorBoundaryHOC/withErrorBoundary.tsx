import * as Sentry from '@sentry/react';
import { ComponentType, ReactElement } from 'react';

import ErrorBoundaryFallback from '../../pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

/**
 * Configuration options for the ErrorBoundary HOC
 */
interface WithErrorBoundaryOptions {
	/** Custom fallback component to render when an error occurs */
	fallback?: ReactElement;
	/** Custom error handler function */
	onError?: (
		error: unknown,
		componentStack: string | undefined,
		eventId: string,
	) => void;
	/** Additional props to pass to the ErrorBoundary */
	sentryOptions?: {
		tags?: Record<string, string>;
		level?: Sentry.SeverityLevel;
	};
}

/**
 * Higher-Order Component that wraps a component with ErrorBoundary
 *
 * @param WrappedComponent - The component to wrap with error boundary
 * @param options - Configuration options for the error boundary
 *
 * @example
 * // Basic usage
 * const SafeComponent = withErrorBoundary(MyComponent);
 *
 * @example
 * // With custom fallback
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   fallback: <div>Something went wrong!</div>
 * });
 *
 * @example
 * // With custom error handler
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   onError: (error, errorInfo) => {
 *     console.error('Component error:', error, errorInfo);
 *   }
 * });
 */
function withErrorBoundary<P extends Record<string, unknown>>(
	WrappedComponent: ComponentType<P>,
	options: WithErrorBoundaryOptions = {},
): ComponentType<P> {
	const {
		fallback = <ErrorBoundaryFallback />,
		onError,
		sentryOptions = {},
	} = options;

	function WithErrorBoundaryComponent(props: P): JSX.Element {
		return (
			<Sentry.ErrorBoundary
				fallback={fallback}
				beforeCapture={(scope): void => {
					// Add component name to context
					scope.setTag(
						'component',
						WrappedComponent.displayName || WrappedComponent.name || 'Unknown',
					);

					// Add any custom tags
					if (sentryOptions.tags) {
						Object.entries(sentryOptions.tags).forEach(([key, value]) => {
							scope.setTag(key, value);
						});
					}

					// Set severity level if provided
					if (sentryOptions.level) {
						scope.setLevel(sentryOptions.level);
					}
				}}
				onError={onError}
			>
				{/* eslint-disable-next-line react/jsx-props-no-spreading */}
				<WrappedComponent {...props} />
			</Sentry.ErrorBoundary>
		);
	}

	// Set display name for debugging purposes
	WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
		WrappedComponent.displayName || WrappedComponent.name || 'Component'
	})`;

	return WithErrorBoundaryComponent;
}

export default withErrorBoundary;
export type { WithErrorBoundaryOptions };
