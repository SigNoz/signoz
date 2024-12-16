import './ReactI18';
import 'styles.scss';

import * as Sentry from '@sentry/react';
import AppRoutes from 'AppRoutes';
import { AxiosError } from 'axios';
import { ThemeProvider } from 'hooks/useDarkMode';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import posthog from 'posthog-js';
import { AppProvider } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Provider } from 'react-redux';
import store from 'store';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry(failureCount, error): boolean {
				if (
					// in case of manually throwing errors please make sure to send error.response.status
					error instanceof AxiosError &&
					error.response?.status &&
					(error.response?.status >= 400 || error.response?.status <= 499)
				) {
					return false;
				}
				return failureCount < 2;
			},
		},
	},
});

const container = document.getElementById('root');

if (process.env.POSTHOG_KEY) {
	posthog.init(process.env.POSTHOG_KEY, {
		api_host: 'https://us.i.posthog.com',
		person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
	});
}

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
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<HelmetProvider>
				<ThemeProvider>
					<TimezoneProvider>
						<QueryClientProvider client={queryClient}>
							<Provider store={store}>
								<AppProvider>
									<AppRoutes />
								</AppProvider>
							</Provider>
							{process.env.NODE_ENV === 'development' && (
								<ReactQueryDevtools initialIsOpen={false} />
							)}
						</QueryClientProvider>
					</TimezoneProvider>
				</ThemeProvider>
			</HelmetProvider>
		</Sentry.ErrorBoundary>,
	);
}
