import { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
// eslint-disable-next-line no-restricted-imports
import { Store } from 'redux';
import { GlobalTimeStoreAdapter } from 'components/GlobalTimeStoreAdapter/GlobalTimeStoreAdapter';
import { ThemeProvider } from 'hooks/useDarkMode';
import TimezoneProvider from 'providers/Timezone';

import { AppLayer } from './types';

export interface AppProvidersProps {
	children: ReactNode;
	store: Store;
	queryClient: QueryClient;
	appContext: AppLayer;
	searchParams: AppLayer;
}

/**
 * The layers that exist before the app knows anything. Mounted for the whole
 * session, including while `AppProvider` is still fetching the user and the boot
 * spinner is on screen, and never remounted after that.
 *
 * A new provider belongs here only if it holds process-wide state that does not
 * depend on the user, the license or the route. One that fetches on mount would
 * fire unauthenticated from here; put it in `AppShell` or lower.
 */
function AppProviders({
	children,
	store,
	queryClient,
	appContext,
	searchParams,
}: AppProvidersProps): JSX.Element {
	return (
		<HelmetProvider>
			{searchParams(
				<ThemeProvider>
					<TimezoneProvider>
						<QueryClientProvider client={queryClient}>
							<Provider store={store}>
								<GlobalTimeStoreAdapter />
								{appContext(children)}
							</Provider>
						</QueryClientProvider>
					</TimezoneProvider>
				</ThemeProvider>,
			)}
		</HelmetProvider>
	);
}

export default AppProviders;
