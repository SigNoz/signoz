import { ConfigProvider } from 'antd';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import AppLayout from 'container/AppLayout';
import { useThemeConfig } from 'hooks/useDarkMode';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import history from 'lib/history';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import React, { Suspense } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import PrivateRoute from './Private';
import routes from './routes';

function App(): JSX.Element {
	const themeConfig = useThemeConfig();

	return (
		<ConfigProvider theme={themeConfig}>
			<Router history={history}>
				<NotificationProvider>
					<PrivateRoute>
						<ResourceProvider>
							<QueryBuilderProvider>
								<AppLayout>
									<Suspense fallback={<Spinner size="large" tip="Loading..." />}>
										<Switch>
											{routes.map(({ path, component, exact }) => (
												<Route
													key={`${path}`}
													exact={exact}
													path={path}
													component={component}
												/>
											))}

											<Route path="*" component={NotFound} />
										</Switch>
									</Suspense>
								</AppLayout>
							</QueryBuilderProvider>
						</ResourceProvider>
					</PrivateRoute>
				</NotificationProvider>
			</Router>
		</ConfigProvider>
	);
}

export default App;
