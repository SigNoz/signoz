import './ReactI18';

import AppRoutes from 'AppRoutes';
import GlobalStyles from 'globalStyles';
import { ThemeProvider } from 'hooks/useDarkMode';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Provider } from 'react-redux';
import store from 'store';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

const container = document.getElementById('root');

if (container) {
	const root = createRoot(container);

	root.render(
		<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
			<HelmetProvider>
				<ThemeProvider>
					<QueryClientProvider client={queryClient}>
						<Provider store={store}>
							<GlobalStyles />
							<AppRoutes />
						</Provider>
						{process.env.NODE_ENV === 'development' && (
							<ReactQueryDevtools initialIsOpen />
						)}
					</QueryClientProvider>
				</ThemeProvider>
			</HelmetProvider>
			,
		</ErrorBoundary>,
	);
}
