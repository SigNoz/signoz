import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import { IS_LOGGED_IN } from 'constants/auth';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import AppLayout from 'modules/AppLayout';
import { RouteProvider } from 'modules/RouteProvider';
import React, { Suspense } from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

import routes from './routes';

const App = (): JSX.Element => (
	<Router history={history}>
		<RouteProvider>
			<AppLayout>
				<Suspense fallback={<Spinner size="large" tip="Loading..." />}>
					<Switch>
						{routes.map(({ path, component, exact }, index) => {
							return (
								<Route key={index} exact={exact} path={path} component={component} />
							);
						})}

						{/* This logic should be moved to app layout */}
						<Route
							path="/"
							exact
							render={(): JSX.Element => {
								return localStorage.getItem(IS_LOGGED_IN) === 'yes' ? (
									<Redirect to={ROUTES.APPLICATION} />
								) : (
									<Redirect to={ROUTES.SIGN_UP} />
								);
							}}
						/>
						<Route path="*" exact component={NotFound} />
					</Switch>
				</Suspense>
			</AppLayout>
		</RouteProvider>
	</Router>
);

export default App;
