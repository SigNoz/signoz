import * as Sentry from '@sentry/react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

function Explorer(): JSX.Element {
	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			Explorer
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
