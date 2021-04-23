import React, { Suspense } from "react";
import { Layout, Spin } from "antd";
import { useThemeSwitcher } from "react-css-theme-switcher";

import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import SideNav from "./Nav/SideNav";
import TopNav from "./Nav/TopNav";

const { Content, Footer } = Layout;

const ServiceMetrics = React.lazy(
	() => import("Src/modules/metrics/ServiceMetricsDef"),
);
const ServiceMap = React.lazy(
	() => import("Src/modules/Servicemap/ServiceMap"),
);
const TraceDetail = React.lazy(() => import("Src/modules/Traces/TraceDetail"));
const TraceGraph = React.lazy(() => import("Src/modules/Traces/TraceGraphDef"));
const UsageExplorer = React.lazy(
	() => import("Src/modules/Usage/UsageExplorerDef"),
);
const ServicesTable = React.lazy(
	() => import("Src/modules/metrics/ServicesTableDef"),
);
const Signup = React.lazy(() => import("Src/modules/Auth/Signup"));
const SettingsPage = React.lazy(
	() => import("Src/modules/Settings/settingsPage"),
);

const IntstrumentationPage = React.lazy(
	() => import("Src/modules/add-instrumentation/instrumentationPage"),
);
//PNOTE
//React. lazy currently only supports default exports. If the module you want to import uses named exports, you can create an intermediate module that reexports it as the default. This ensures that tree shaking keeps working and that you don't pull in unused components.

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

						{/* <Divider /> */}

						<Suspense fallback={<Spin size="large" />}>
							<Switch>
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
								<Route path="/" component={ServicesTable} />
								<Route path="/application" exact component={ServicesTable} />
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
