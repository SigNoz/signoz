import './wdyr';
import './ReactI18';

import AppRoutes from 'AppRoutes';
import { ThemeProvider } from 'hooks/useDarkMode';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { Provider } from 'react-redux';
import reportWebVitals from 'reportWebVitals';
import { queryClient } from 'services/queryClient.service';
import store from 'store';

if (process.env.NODE_ENV === 'development') {
	reportWebVitals(console.log);
}

const container = document.getElementById('root');

if (container) {
	const root = createRoot(container);

	root.render(
		<ThemeProvider>
			<QueryClientProvider client={queryClient}>
				<Provider store={store}>
					<AppRoutes />
				</Provider>
				{process.env.NODE_ENV === 'development' && (
					<ReactQueryDevtools initialIsOpen />
				)}
			</QueryClientProvider>
		</ThemeProvider>,
	);
}
