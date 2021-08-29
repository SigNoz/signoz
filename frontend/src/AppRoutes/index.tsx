import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import { IS_LOGGED_IN } from 'constants/auth';
import ROUTES from 'constants/routes';
import AppLayout from 'modules/AppLayout';
import { RouteProvider } from 'modules/RouteProvider';
import React, { Suspense } from 'react';
import { BrowserRouter, Redirect,Route, Switch } from 'react-router-dom';

import routes from './routes';

const App = () => (
	<BrowserRouter basename="/">
		<RouteProvider>
			<AppLayout>
				<Suspense fallback={<Spinner size="large" tip="Loading..." />}>
					<Switch>
						{routes.map(({ path, component, exact }) => {
							return <Route exact={exact} path={path} component={component} />;
						})}

						{/* This logic should be moved to app layout */}
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
						<Route path="*" component={NotFound} />
					</Switch>
				</Suspense>
			</AppLayout>
		</RouteProvider>
	</BrowserRouter>
);

export default App;
