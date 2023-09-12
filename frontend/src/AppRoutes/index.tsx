import { ConfigProvider } from 'antd';
import getFeaturesFlags from 'api/features/getFeatureFlags';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import { FeatureKeys } from 'constants/features';
import AppLayout from 'container/AppLayout';
import { useThemeConfig } from 'hooks/useDarkMode';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import history from 'lib/history';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import { Suspense, useEffect, useState } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import PrivateRoute from './Private';
import defaultRoutes from './routes';

function App(): JSX.Element {
	const themeConfig = useThemeConfig();
	const [routes, setRoutes] = useState(defaultRoutes);

	const isOnboardingEnabled = (featureFlags: any): boolean => {
		for (let index = 0; index < featureFlags.length; index += 1) {
			const featureFlag = featureFlags[index];

			// Temporarily using OSS feature flag, need to switch to ONBOARDING once API changes are available
			if (featureFlag.name === FeatureKeys.ONBOARDING) {
				return featureFlag.active;
			}
		}

		return false;
	};

	const setRoutesBasedOnFF = (featureFlags: any[]): void => {
		if (!isOnboardingEnabled(featureFlags)) {
			const newRoutes = routes.filter((route) => route?.key !== 'GET_STARTED');

			setRoutes(newRoutes);
		}
	};

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
		async function fetchFeatureFlags() {
			try {
				const response = await getFeaturesFlags();

				setRoutesBasedOnFF(response.payload || []);
			} catch (error) {
				console.error('Error fetching data:', error);
			}
		}

		fetchFeatureFlags();
	}, []);

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
