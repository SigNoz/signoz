import React, { Suspense } from 'react';
import { Spin } from 'antd';
import { useThemeSwitcher } from 'react-css-theme-switcher';
import ROUTES from 'Src/constants/routes';
import { IS_LOGGED_IN } from 'Src/constants/auth';
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom';

import BaseLayout from './BaseLayout';
import {
	ServiceMetrics,
	ServiceMap,
	TraceDetail,
	TraceGraph,
	UsageExplorer,
	ServicesTable,
	Signup,
	SettingsPage,
	IntstrumentationPage,
} from 'Src/pages';
import { RouteProvider } from './RouteProvider';

const App = () => {
	const { status } = useThemeSwitcher();

	if (status === 'loading') {
		return null;
	}

	return (
		<BrowserRouter>
			<Suspense fallback={<Spin size="large" />}>
				<Route path={'/'}>
					<Switch>
						<RouteProvider>
							<BaseLayout>
								<Suspense fallback={<Spin size="large" />}>
									<Route path={ROUTES.SIGN_UP} exact component={Signup} />
									<Route path={ROUTES.APPLICATION} exact component={ServicesTable} />
									<Route
										path={ROUTES.SERVICE_METRICS}
										exact
										component={ServiceMetrics}
									/>
									<Route path={ROUTES.SERVICE_MAP} exact component={ServiceMap} />
									<Route path={ROUTES.TRACES} exact component={TraceDetail} />
									<Route path={ROUTES.TRACE_GRAPH} exact component={TraceGraph} />
									<Route path={ROUTES.SETTINGS} exact component={SettingsPage} />
									<Route
										path={ROUTES.INSTRUMENTATION}
										exact
										component={IntstrumentationPage}
									/>
									<Route
										path={ROUTES.USAGE_EXPLORER}
										exactexact
										component={UsageExplorer}
									/>
									<Route
										path="/"
										exact
										render={() => {
											return localStorage.getItem(IS_LOGGED_IN) === 'yes' ? (
												<Redirect to={ROUTES.APPLICATION} />
											) : (
												<Redirect to={ROUTES.SIGN_UP} />
											);
										}}
									/>
								</Suspense>

							</BaseLayout>
						</RouteProvider>
					</Switch>
				</Route>
			</Suspense>
		</BrowserRouter>
	);
};

export default App;
