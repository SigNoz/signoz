import React, { Suspense } from "react";
import { Spin } from "antd";
import { useThemeSwitcher } from "react-css-theme-switcher";
import ROUTES from "Src/constants/routes";
import { IS_LOGGED_IN } from "Src/constants/auth";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";

import BaseLayout from "./BaseLayout";
import {
	ServiceMetrics,
	ServiceMap,
	TraceDetail,
	TraceGraph,
	UsageExplorer,
	ServicesTable,
	Signup,
	SettingsPage,
	InstrumentationPage,
} from "Src/pages";
import { RouteProvider } from "./RouteProvider";
import NotFound from "Src/components/NotFound";

const App = () => {
	const { status } = useThemeSwitcher();

	if (status === "loading") {
		return <Spin size="large" />;
	}

	return (
		<BrowserRouter>
			<RouteProvider>
				<BaseLayout>
					<Suspense fallback={<Spin size="large" />}>
						<Switch>
							<Route path={ROUTES.SIGN_UP} exact component={Signup} />
							<Route path={ROUTES.APPLICATION} exact component={ServicesTable} />
							<Route path={ROUTES.SERVICE_METRICS} exact component={ServiceMetrics} />
							<Route path={ROUTES.SERVICE_MAP} exact component={ServiceMap} />
							<Route path={ROUTES.TRACES} exact component={TraceDetail} />
							<Route path={ROUTES.TRACE_GRAPH} exact component={TraceGraph} />
							<Route path={ROUTES.SETTINGS} exact component={SettingsPage} />
							<Route
								path={ROUTES.INSTRUMENTATION}
								exact
								component={InstrumentationPage}
							/>
							<Route path={ROUTES.USAGE_EXPLORER} exact component={UsageExplorer} />
							<Route
								path="/"
								exact
								render={() => {
									return localStorage.getItem(IS_LOGGED_IN) === "yes" ? (
										<Redirect to={ROUTES.APPLICATION} />
									) : (
										<Redirect to={ROUTES.SIGN_UP} />
									);
								}}
							/>

							<Route path="*" exact component={NotFound} />
						</Switch>
					</Suspense>
				</BaseLayout>
			</RouteProvider>
		</BrowserRouter>
	);
};

export default App;
