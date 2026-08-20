import { ReactNode } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
// eslint-disable-next-line no-restricted-imports
import { Provider } from 'react-redux';
// eslint-disable-next-line no-restricted-imports
import { Store } from 'redux';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { GlobalTimeStoreAdapter } from 'components/GlobalTimeStoreAdapter/GlobalTimeStoreAdapter';
import { KeyboardHotkeysProvider } from 'hooks/hotkeys/useKeyboardHotkeys';
import { ThemeProvider } from 'hooks/useDarkMode';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import { AppContext } from 'providers/App/App';
import { IAppContext } from 'providers/App/types';
import { CmdKProvider } from 'providers/cmdKProvider';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import {
	QueryBuilderContext,
	QueryBuilderProvider,
} from 'providers/QueryBuilder';
import TimezoneProvider from 'providers/Timezone';
import { QueryBuilderContextType } from 'types/common/queryBuilder';

import AntdThemeBridge from './AntdThemeBridge';

/**
 * A layer the runner supplies. A render function rather than a component, so an
 * inline one does not change identity between renders and remount the tree.
 */
export type HarnessWrapper = (children: ReactNode) => ReactNode;

export interface AppHarnessProps {
	children: ReactNode;
	/** Stands in for `AppProvider`, whose fetches no harness can make. */
	appContext: IAppContext;
	store: Store;
	queryClient: QueryClient;
	/** When set, replaces `QueryBuilderProvider` with a fixed context value. */
	queryBuilder?: Partial<QueryBuilderContextType>;
	/**
	 * The router the runner drives: jest a `MemoryRouter`, Storybook a `Router` on
	 * the contained history. Everything above it in the tree is router-free, so
	 * the choice stays here.
	 */
	router: HarnessWrapper;
	/** The nuqs adapter: the react one under jest, the testing one in Storybook. */
	searchParams: HarnessWrapper;
	/** Rendered beside the subject: Storybook's palette, overlay and probe. */
	overlays?: ReactNode;
}

/**
 * The app's provider tree, as `src/index.tsx` and `src/AppRoutes/index.tsx`
 * mount it, minus Sentry, posthog and `AppProvider`, with the pieces a test
 * runner has to choose left as props. Both harnesses that render pages outside
 * the app (jest's `test-utils`, Storybook's `StorybookProviders`) go through
 * here, so a provider added to the app is added once and both see it.
 */
function AppHarness({
	children,
	appContext,
	store,
	queryClient,
	queryBuilder,
	router,
	searchParams,
	overlays,
}: AppHarnessProps): JSX.Element {
	const subject = queryBuilder ? (
		<QueryBuilderContext.Provider value={queryBuilder as QueryBuilderContextType}>
			{children}
		</QueryBuilderContext.Provider>
	) : (
		<QueryBuilderProvider>{children}</QueryBuilderProvider>
	);

	return (
		<HelmetProvider>
			{searchParams(
				<ThemeProvider>
					<TimezoneProvider>
						<QueryClientProvider client={queryClient}>
							<Provider store={store}>
								<GlobalTimeStoreAdapter />
								<AppContext.Provider value={appContext}>
									<AntdThemeBridge>
										{router(
											<TooltipProvider>
												<CmdKProvider>
													<NotificationProvider>
														<ErrorModalProvider>
															<ResourceProvider>
																<KeyboardHotkeysProvider>
																	<PreferenceContextProvider>
																		{subject}
																		{overlays}
																	</PreferenceContextProvider>
																</KeyboardHotkeysProvider>
															</ResourceProvider>
														</ErrorModalProvider>
													</NotificationProvider>
												</CmdKProvider>
											</TooltipProvider>,
										)}
									</AntdThemeBridge>
								</AppContext.Provider>
							</Provider>
						</QueryClientProvider>
					</TimezoneProvider>
				</ThemeProvider>,
			)}
		</HelmetProvider>
	);
}

AppHarness.defaultProps = {
	queryBuilder: undefined,
	overlays: undefined,
};

export default AppHarness;
