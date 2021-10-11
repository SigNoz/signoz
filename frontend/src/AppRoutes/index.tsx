import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import history from 'lib/history';
import AppLayout from 'modules/AppLayout';
import { RouteProvider } from 'modules/RouteProvider';
import React, { Suspense } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

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
						<Route path="*" exact component={NotFound} />
					</Switch>
				</Suspense>
			</AppLayout>
		</RouteProvider>
	</Router>
);

export default App;
