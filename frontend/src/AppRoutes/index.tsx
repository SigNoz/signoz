import { ConfigProvider } from 'antd';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import AppLayout from 'container/AppLayout';
import { useThemeConfig } from 'hooks/useDarkMode';
import useGetFeatureFlag from 'hooks/useGetFeatureFlag';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import history from 'lib/history';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import { Suspense, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Router, Switch } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_FEATURE_FLAG_RESPONSE } from 'types/actions/app';
import AppReducer from 'types/reducer/app';
import { trackPageView } from 'utils/segmentAnalytics';

import PrivateRoute from './Private';
import defaultRoutes from './routes';

function App(): JSX.Element {
	const themeConfig = useThemeConfig();
	const [routes, setRoutes] = useState(defaultRoutes);
	const { isLoggedIn: isLoggedInState, user } = useSelector<
		AppState,
		AppReducer
	>((state) => state.app);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { hostname, pathname } = window.location;

	const featureResponse = useGetFeatureFlag((allFlags) => {
		const isOnboardingEnabled =
			allFlags.find((flag) => flag.name === FeatureKeys.ONBOARDING)?.active ||
			false;

		const isChatSupportEnabled =
			allFlags.find((flag) => flag.name === FeatureKeys.CHAT_SUPPORT)?.active ||
			false;

		dispatch({
			type: UPDATE_FEATURE_FLAG_RESPONSE,
			payload: {
				featureFlag: allFlags,
				refetch: featureResponse.refetch,
			},
		});

		if (
			!isOnboardingEnabled ||
			!(hostname && hostname.endsWith('signoz.cloud'))
		) {
			const newRoutes = routes.filter(
				(route) => route?.path !== ROUTES.GET_STARTED,
			);

			setRoutes(newRoutes);
		}

		if (isLoggedInState && isChatSupportEnabled) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			window.Intercom('boot', {
				app_id: process.env.INTERCOM_APP_ID,
				email: user?.email || '',
				name: user?.name || '',
			});
		}
	});

	useEffect(() => {
		if (isLoggedInState && user && user.userId && user.email) {
			window.analytics.identify(user?.userId, {
				email: user?.email || '',
				name: user?.name || '',
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoggedInState]);

	useEffect(() => {
		trackPageView(pathname);
	}, [pathname]);

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
