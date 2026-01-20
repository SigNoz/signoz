import { render, screen } from '@testing-library/react';
import React from 'react';

import withErrorBoundary, {
	WithErrorBoundaryOptions,
} from '../withErrorBoundary';

// Mock dependencies before imports
jest.mock('@sentry/react', () => {
	const ReactMock = jest.requireActual('react');

	class MockErrorBoundary extends ReactMock.Component<
		{
			children: React.ReactNode;
			fallback: React.ReactElement;
			onError?: (error: Error, componentStack: string, eventId: string) => void;
			beforeCapture?: (scope: {
				setTag: (key: string, value: string) => void;
				setLevel: (level: string) => void;
			}) => void;
		},
		{ hasError: boolean }
	> {
		constructor(props: MockErrorBoundary['props']) {
			super(props);
			this.state = { hasError: false };
		}

		static getDerivedStateFromError(): { hasError: boolean } {
			return { hasError: true };
		}

		componentDidCatch(error: Error, errorInfo: { componentStack: string }): void {
			const { beforeCapture, onError } = this.props;
			if (beforeCapture) {
				const mockScope = {
					setTag: jest.fn(),
					setLevel: jest.fn(),
				};
				beforeCapture(mockScope);
			}
			if (onError) {
				onError(error, errorInfo.componentStack, 'mock-event-id');
			}
		}

		render(): React.ReactNode {
			const { hasError } = this.state;
			const { fallback, children } = this.props;
			if (hasError) {
				return <div data-testid="error-boundary-fallback">{fallback}</div>;
			}
			return <div data-testid="app-error-boundary">{children}</div>;
		}
	}

	return {
		ErrorBoundary: MockErrorBoundary,
		SeverityLevel: {
			error: 'error',
			warning: 'warning',
			info: 'info',
		},
	};
});

jest.mock(
	'../../../pages/ErrorBoundaryFallback/ErrorBoundaryFallback',
	() =>
		function MockErrorBoundaryFallback(): JSX.Element {
			return (
				<div data-testid="default-error-fallback">Default Error Fallback</div>
			);
		},
);

// Test component that can throw errors
interface TestComponentProps {
	shouldThrow?: boolean;
	message?: string;
}

function TestComponent({
	shouldThrow = false,
	message = 'Test Component',
}: TestComponentProps): JSX.Element {
	if (shouldThrow) {
		throw new Error('Test error');
	}
	return <div data-testid="test-component">{message}</div>;
}

TestComponent.defaultProps = {
	shouldThrow: false,
	message: 'Test Component',
};

// Test component with display name
function NamedComponent(): JSX.Element {
	return <div data-testid="named-component">Named Component</div>;
}
NamedComponent.displayName = 'NamedComponent';

describe('withErrorBoundary', () => {
	// Suppress console errors for cleaner test output
	const originalError = console.error;
	beforeAll(() => {
		console.error = jest.fn();
	});

	afterAll(() => {
		console.error = originalError;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should wrap component with ErrorBoundary and render successfully', () => {
		// Arrange
		const SafeComponent = withErrorBoundary(TestComponent);

		// Act
		render(<SafeComponent message="Hello World" />);

		// Assert
		expect(screen.getByTestId('app-error-boundary')).toBeInTheDocument();
		expect(screen.getByTestId('test-component')).toBeInTheDocument();
		expect(screen.getByText('Hello World')).toBeInTheDocument();
	});

	it('should render fallback UI when component throws error', () => {
		// Arrange
		const SafeComponent = withErrorBoundary(TestComponent);

		// Act
		render(<SafeComponent shouldThrow />);

		// Assert
		expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
		expect(screen.getByTestId('default-error-fallback')).toBeInTheDocument();
	});

	it('should render custom fallback component when provided', () => {
		// Arrange
		const customFallback = (
			<div data-testid="custom-fallback">Custom Error UI</div>
		);
		const options: WithErrorBoundaryOptions = {
			fallback: customFallback,
		};
		const SafeComponent = withErrorBoundary(TestComponent, options);

		// Act
		render(<SafeComponent shouldThrow />);

		// Assert
		expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
		expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
		expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
	});

	it('should call custom error handler when error occurs', () => {
		// Arrange
		const mockErrorHandler = jest.fn();
		const options: WithErrorBoundaryOptions = {
			onError: mockErrorHandler,
		};
		const SafeComponent = withErrorBoundary(TestComponent, options);

		// Act
		render(<SafeComponent shouldThrow />);

		// Assert
		expect(mockErrorHandler).toHaveBeenCalledWith(
			expect.any(Error),
			expect.any(String),
			'mock-event-id',
		);
		expect(mockErrorHandler).toHaveBeenCalledTimes(1);
	});

	it('should set correct display name for debugging', () => {
		// Arrange & Act
		const SafeTestComponent = withErrorBoundary(TestComponent);
		const SafeNamedComponent = withErrorBoundary(NamedComponent);

		// Assert
		expect(SafeTestComponent.displayName).toBe(
			'withErrorBoundary(TestComponent)',
		);
		expect(SafeNamedComponent.displayName).toBe(
			'withErrorBoundary(NamedComponent)',
		);
	});

	it('should handle component without display name', () => {
		// Arrange
		function AnonymousComponent(): JSX.Element {
			return <div>Anonymous</div>;
		}

		// Act
		const SafeAnonymousComponent = withErrorBoundary(AnonymousComponent);

		// Assert
		expect(SafeAnonymousComponent.displayName).toBe(
			'withErrorBoundary(AnonymousComponent)',
		);
	});
});
