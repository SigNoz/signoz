import React, { Suspense, useEffect } from "react";
import ROUTES from "Src/constants/routes";
import { BrowserRouter, Route, Switch, Redirect } from "react-router-dom";
import CustomSpinner from "../components/Spinner";
import { IS_LOGGED_IN } from "Src/constants/auth";

import AppLayout from "../modules/AppLayout";

import NotFound from "Src/components/NotFound";
import { RouteProvider } from "Src/modules/RouteProvider";
import routes from "./routes";

const App = () => (
	<BrowserRouter basename="/">
		<RouteProvider>
			<AppLayout>
				<Suspense fallback={<CustomSpinner size="large" tip="Loading..." />}>
					<Switch>
						{routes.map(({ path, component, exact }) => {
							return <Route exact={exact} path={path} component={component} />;
						})}

						{/* This logic should be moved to app layout */}
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
						<Route path="*" component={NotFound} />
					</Switch>
				</Suspense>
			</AppLayout>
		</RouteProvider>
	</BrowserRouter>
);

export default App;
