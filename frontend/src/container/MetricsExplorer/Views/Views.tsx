import * as Sentry from '@sentry/react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

function Views(): JSX.Element {
	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			Views
		</Sentry.ErrorBoundary>
	);
}

export default Views;
