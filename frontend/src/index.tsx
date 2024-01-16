import './ReactI18';
import 'styles.scss';

import * as Sentry from '@sentry/react';
import AppRoutes from 'AppRoutes';
import { ThemeProvider } from 'hooks/useDarkMode';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import store from 'store';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry(failureCount, error): boolean {
				if (
					error instanceof Error &&
					error.message.includes('API responded with 400')
				) {
					return false;
				}
				return failureCount < 2;
			},
		},
	},
});

const container = document.getElementById('root');

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	tunnel: process.env.TUNNEL_URL,
	environment: 'production',
	integrations: [
		Sentry.browserTracingIntegration(),
		Sentry.replayIntegration({
			maskAllText: false,
			blockAllMedia: false,
		}),
	],
	// Performance Monitoring
	tracesSampleRate: 1.0, //  Capture 100% of the transactions
	// Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
	tracePropagationTargets: [],
	// Session Replay
	replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
	replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

if (container) {
	const root = createRoot(container);

	root.render(
		<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
			<HelmetProvider>
				<ThemeProvider>
					<QueryClientProvider client={queryClient}>
						<Provider store={store}>
							<AppRoutes />
						</Provider>
					</QueryClientProvider>
				</ThemeProvider>
			</HelmetProvider>
		</ErrorBoundary>,
	);
}
