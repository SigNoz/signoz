import React, { Suspense } from "react";
import { Layout, Spin } from "antd";
import { useThemeSwitcher } from "react-css-theme-switcher";
import ROUTES from "Src/constants/routes";
import { IS_LOGGED_IN } from "Src/constants/auth";
import {
	BrowserRouter as Router,
	Route,
	Switch,
	Redirect,
} from "react-router-dom";

import SideNav from "./Nav/SideNav";
import TopNav from "./Nav/TopNav";
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
} from "Src/pages";

const { Content, Footer } = Layout;

const App = () => {
	const { status } = useThemeSwitcher();

	if (status === "loading") {
		return null;
	}

	return (
		<Router basename="/">
			<Layout style={{ minHeight: "100vh" }}>
				<SideNav />
				<Layout className="site-layout">
					<Content style={{ margin: "0 16px" }}>
						<TopNav />
						<Suspense fallback={<Spin size="large" />}>
							<Switch>
								<Route path={ROUTES.SIGN_UP} component={Signup} />
								<Route path={ROUTES.SERVICE_METRICS} component={ServiceMetrics} />
								<Route path={ROUTES.SERVICE_MAP} component={ServiceMap} />
								<Route path={ROUTES.TRACES} exact component={TraceDetail} />
								<Route path={ROUTES.TRACE_GRAPH} component={TraceGraph} />
								<Route path={ROUTES.SETTINGS} exact component={SettingsPage} />
								<Route
									path={ROUTES.INSTRUMENTATION}
									exact
									component={IntstrumentationPage}
								/>
								<Route path={ROUTES.USAGE_EXPLORER} component={UsageExplorer} />
								<Route path={ROUTES.APPLICATION} exact component={ServicesTable} />
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
							</Switch>
						</Suspense>
					</Content>
					<Footer style={{ textAlign: "center", fontSize: 10 }}>
						SigNoz Inc. ©2020{" "}
					</Footer>
				</Layout>
			</Layout>
		</Router>
	);
};

export default App;
