import { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient } from 'react-query';
import AppProviders from 'app/AppProviders';
import AppRoutes from 'AppRoutes';
import { AxiosError } from 'axios';
import { configureOverlayScrollbars } from 'lib/configureOverlayScrollbars';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { AppProvider } from 'providers/App/App';
import store from 'store';
import APIError from 'types/api/error';
import { installTranslationResilience } from 'translation-resilience';

import 'lib/monaco/setup';

import './ReactI18';

import 'styles.scss';

installTranslationResilience();
configureOverlayScrollbars();

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

const searchParams = (children: ReactNode): ReactNode => (
	<NuqsAdapter>{children}</NuqsAdapter>
);

const appContext = (children: ReactNode): ReactNode => (
	<AppProvider>{children}</AppProvider>
);

const container = document.getElementById('root');

if (container) {
	const root = createRoot(container);

	root.render(
		<AppProviders
			store={store}
			queryClient={queryClient}
			appContext={appContext}
			searchParams={searchParams}
		>
			<AppRoutes />
		</AppProviders>,
	);
}
