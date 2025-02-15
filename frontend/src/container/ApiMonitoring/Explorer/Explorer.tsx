import * as Sentry from '@sentry/react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

function Explorer(): JSX.Element {
	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			EXPLORER : API MONITROING LANDING PAGE
		</Sentry.ErrorBoundary>
	);
}

export default Explorer;
