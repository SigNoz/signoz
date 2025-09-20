import { Button } from 'antd';
import { useState } from 'react';

import { withErrorBoundary } from './index';

/**
 * Example component that can throw errors
 */
function ProblematicComponent(): JSX.Element {
	const [shouldThrow, setShouldThrow] = useState(false);

	if (shouldThrow) {
		throw new Error('This is a test error from ProblematicComponent!');
	}

	return (
		<div style={{ padding: '20px' }}>
			<h3>Problematic Component</h3>
			<p>This component can throw errors when the button is clicked.</p>
			<Button type="primary" onClick={(): void => setShouldThrow(true)} danger>
				Trigger Error
			</Button>
		</div>
	);
}

/**
 * Basic usage - wraps component with default error boundary
 */
export const SafeProblematicComponent = withErrorBoundary(ProblematicComponent);

/**
 * Usage with custom fallback component
 */
function CustomErrorFallback(): JSX.Element {
	return (
		<div
			style={{ padding: '20px', border: '1px solid red', borderRadius: '4px' }}
		>
			<h4 style={{ color: 'red' }}>Custom Error Fallback</h4>
			<p>Something went wrong in this specific component!</p>
			<Button onClick={(): void => window.location.reload()}>Reload Page</Button>
		</div>
	);
}

export const SafeProblematicComponentWithCustomFallback = withErrorBoundary(
	ProblematicComponent,
	{
		fallback: <CustomErrorFallback />,
	},
);

/**
 * Usage with custom error handler
 */
export const SafeProblematicComponentWithErrorHandler = withErrorBoundary(
	ProblematicComponent,
	{
		onError: (error, errorInfo) => {
			console.error('Custom error handler:', error);
			console.error('Error info:', errorInfo);
			// You could also send to analytics, logging service, etc.
		},
		sentryOptions: {
			tags: {
				section: 'dashboard',
				priority: 'high',
			},
			level: 'error',
		},
	},
);

/**
 * Example of wrapping an existing component from the codebase
 */
function ExistingComponent({
	title,
	data,
}: {
	title: string;
	data: any[];
}): JSX.Element {
	// This could be any existing component that might throw errors
	return (
		<div>
			<h4>{title}</h4>
			<ul>
				{data.map((item, index) => (
					// eslint-disable-next-line react/no-array-index-key
					<li key={index}>{item.name}</li>
				))}
			</ul>
		</div>
	);
}

export const SafeExistingComponent = withErrorBoundary(ExistingComponent, {
	sentryOptions: {
		tags: {
			component: 'ExistingComponent',
			feature: 'data-display',
		},
	},
});

/**
 * Usage examples in a container component
 */
export function ErrorBoundaryExamples(): JSX.Element {
	const sampleData = [
		{ name: 'Item 1' },
		{ name: 'Item 2' },
		{ name: 'Item 3' },
	];

	return (
		<div style={{ padding: '20px' }}>
			<h2>Error Boundary HOC Examples</h2>

			<div style={{ marginBottom: '20px' }}>
				<h3>1. Basic Usage</h3>
				<SafeProblematicComponent />
			</div>

			<div style={{ marginBottom: '20px' }}>
				<h3>2. With Custom Fallback</h3>
				<SafeProblematicComponentWithCustomFallback />
			</div>

			<div style={{ marginBottom: '20px' }}>
				<h3>3. With Custom Error Handler</h3>
				<SafeProblematicComponentWithErrorHandler />
			</div>

			<div style={{ marginBottom: '20px' }}>
				<h3>4. Wrapped Existing Component</h3>
				<SafeExistingComponent title="Sample Data" data={sampleData} />
			</div>
		</div>
	);
}
