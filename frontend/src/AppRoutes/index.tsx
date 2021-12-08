import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import ROUTES from 'constants/routes';
import AppLayout from 'container/AppLayout';
import history from 'lib/history';
import React, { Suspense, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Redirect, Route, Router, Switch } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import routes from './routes';


const App = (): JSX.Element => {
	const { isLoggedIn, isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	useEffect(() => {
		const preMode: mode = isDarkMode ? 'darkMode' : 'lightMode';
		const postMode: mode = isDarkMode ? 'lightMode' : 'darkMode';

		const id: mode = preMode;
		const head = document.head;
		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = isDarkMode ? '/css/antd.dark.min.css' : '/css/antd.min.css';
		link.media = 'all';
		link.id = id;
		head.appendChild(link);

		link.onload = (): void => {
			const prevNode = document.getElementById(postMode);
			prevNode?.remove();
		};
	}, []);

	return (
		<Router history={history}>
			<AppLayout>
				<Suspense fallback={<Spinner size="large" tip="Loading..." />}>
					<Switch>
						{routes.map(({ path, component, exact }, index) => (
							<Route key={index} exact={exact} path={path} component={component} />
						))}
						<Route
							path="/"
							exact
							render={(): JSX.Element =>
								isLoggedIn ? (
									<Redirect to={ROUTES.APPLICATION} />
								) : (
									<Redirect to={ROUTES.SIGN_UP} />
								)
							}
						/>
						<Route path="*" component={NotFound} />
					</Switch>
				</Suspense>
			</AppLayout>
		</Router>
	);
};


type mode = 'darkMode' | 'lightMode';

export default App;
