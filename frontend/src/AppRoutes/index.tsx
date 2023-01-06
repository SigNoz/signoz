import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import AppLayout from 'container/AppLayout';
import history from 'lib/history';
import React, { Suspense } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import PrivateRoute from './Private';
import routes from './routes';

function App(): JSX.Element {
	return (
		<Router history={history}>
			<PrivateRoute>
				<AppLayout>
					<Suspense fallback={<Spinner size="large" tip="Loading..." />}>
						<Switch>
							{routes.map(({ path, component, exact }) => {
								return (
									<Route
										key={`${path}`}
										exact={exact}
										path={path}
										component={component}
									/>
								);
							})}

							<Route path="*" component={NotFound} />
						</Switch>
					</Suspense>
				</AppLayout>
			</PrivateRoute>
		</Router>
	);
}

export default App;
