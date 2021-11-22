import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import AppLayout from 'container/AppLayout';
import history from 'lib/history';
import React, { Suspense } from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

import routes from './routes';

const App = (): JSX.Element => (
	<Router history={history}>
		<AppLayout>
			<Suspense fallback={<Spinner size="large" tip="Loading..." />}>
				<Switch>
					{routes.map(({ path, component, exact }) => {
						return (
							<Route key={path} exact={exact} path={path} component={component} />
						);
					})}
					<Redirect from="/" to={ROUTES.APPLICATION} />
					<Route component={NotFound} />
				</Switch>
			</Suspense>
		</AppLayout>
	</Router>
);

export default App;
