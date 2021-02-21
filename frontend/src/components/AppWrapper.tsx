import React, { Suspense, useState } from "react";
import { Spin } from "antd";
import { Route, Switch, Redirect } from "react-router-dom";
import Signup from "./Signup";
const App = React.lazy(() => import("Src/components/App"));

const AppWrapper = () => {
	return (
		<Suspense fallback={<Spin size="large" />}>
			<Switch>
				<Route path="/application" exact component={App} />
				<Route path="/application/:servicename" component={App} />
				<Route path="/service-map" component={App} />
				<Route path="/traces" exact component={App} />
				<Route path="/traces/:id" component={App} />
				<Route path="/usage-explorer" component={App} />
				<Route path="/settings" component={App} />
				<Route path="/instumentation" component={App} />
				<Route path="/signup" component={Signup} />
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
	);
};

export default AppWrapper;
