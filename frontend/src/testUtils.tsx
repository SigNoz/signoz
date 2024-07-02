import { ConfigProvider } from 'antd';
import PrivateRoute from 'AppRoutes/Private';
import { AxiosError } from 'axios';
import AppLayout from 'container/AppLayout';
import { createMemoryHistory } from 'history';
import { KeyboardHotkeysProvider } from 'hooks/hotkeys/useKeyboardHotkeys';
import { ThemeProvider, useThemeConfig } from 'hooks/useDarkMode';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import createQueryParams from 'lib/createQueryParams';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import React from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Router, Switch } from 'react-router-dom';
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

// todo: added any type for now only, will changed
export function TestWrapper(props: any): JSX.Element {
	const { children, path = '/', queryParams = {} } = props;

	const themeConfig = useThemeConfig();

	const search = createQueryParams(queryParams);
	const routePath = `${path}?${search}`;

	const history = React.useMemo(
		() => createMemoryHistory({ initialEntries: [routePath] }),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	return (
		<HelmetProvider>
			<ThemeProvider>
				<MemoryRouter initialEntries={[routePath]}>
					<QueryClientProvider client={queryClient}>
						<Provider store={store}>
							<ConfigProvider theme={themeConfig}>
								<Router history={history}>
									<NotificationProvider>
										<PrivateRoute>
											<ResourceProvider>
												<QueryBuilderProvider>
													<DashboardProvider>
														<KeyboardHotkeysProvider>
															<AppLayout>
																<Switch>
																	<Route exact path={path}>
																		{children}
																	</Route>
																</Switch>
															</AppLayout>
														</KeyboardHotkeysProvider>
													</DashboardProvider>
												</QueryBuilderProvider>
											</ResourceProvider>
										</PrivateRoute>
									</NotificationProvider>
								</Router>
							</ConfigProvider>
						</Provider>
					</QueryClientProvider>
				</MemoryRouter>
			</ThemeProvider>
		</HelmetProvider>
	);
}
