import React, { Suspense } from "react";
import { Layout, Spin } from "antd";
import { useThemeSwitcher } from "react-css-theme-switcher";

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
								<Route path="/signup" component={Signup} />
								<Route path="/application/:servicename" component={ServiceMetrics} />
								<Route path="/service-map" component={ServiceMap} />
								<Route path="/traces" exact component={TraceDetail} />
								<Route path="/traces/:id" component={TraceGraph} />
								<Route path="/settings" exact component={SettingsPage} />
								<Route
									path="/add-instrumentation"
									exact
									component={IntstrumentationPage}
								/>
								<Route path="/usage-explorer" component={UsageExplorer} />
								<Route path="/application" exact component={ServicesTable} />
								<Route
									path="/"
									exact
									render={() => {
										return localStorage.getItem("isLoggedIn") === "yes" ? (
											<Redirect to="/application" />
										) : (
											<Redirect to="/signup" />
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
