import './ReactI18';
import 'styles.scss';

import AppRoutes from 'AppRoutes';
import { AxiosError } from 'axios';
import { ThemeProvider } from 'hooks/useDarkMode';
import { AppProvider } from 'providers/App/App';
import TimezoneProvider from 'providers/Timezone';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import store from 'store';
import APIError from 'types/api/error';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry(failureCount, error): boolean {
				if (
					// in case of manually throwing errors please make sure to send error.response.status
					(error instanceof AxiosError &&
						error.response?.status &&
						error.response?.status >= 400 &&
						error.response?.status <= 499) ||
					(error instanceof APIError &&
						error.getHttpStatusCode() >= 400 &&
						error.getHttpStatusCode() <= 499)
				) {
					return false;
				}
				return failureCount < 2;
			},
		},
	},
});

const container = document.getElementById('root');

if (container) {
	const root = createRoot(container);

	root.render(
		<HelmetProvider>
			<ThemeProvider>
				<TimezoneProvider>
					<QueryClientProvider client={queryClient}>
						<Provider store={store}>
							<AppProvider>
								<AppRoutes />
							</AppProvider>
						</Provider>
					</QueryClientProvider>
				</TimezoneProvider>
			</ThemeProvider>
		</HelmetProvider>,
	);
}
