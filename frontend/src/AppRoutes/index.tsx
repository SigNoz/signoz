import { ConfigProvider } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import AppLayout from 'container/AppLayout';
import { useThemeConfig } from 'hooks/useDarkMode';
import useGetFeatureFlag from 'hooks/useGetFeatureFlag';
import useLicense, { LICENSE_PLAN_KEY } from 'hooks/useLicense';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import history from 'lib/history';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
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
	const { data } = useLicense();
	const [routes, setRoutes] = useState(defaultRoutes);
	const { role, isLoggedIn: isLoggedInState, user } = useSelector<
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

	const isOnBasicPlan =
		data?.payload?.licenses?.some(
			(license) =>
				license.isCurrent && license.planKey === LICENSE_PLAN_KEY.BASIC_PLAN,
		) || data?.payload?.licenses === null;

	useEffect(() => {
		const isIdentifiedUser = getLocalStorageApi(LOCALSTORAGE.IS_IDENTIFIED_USER);

		if (
			isLoggedInState &&
			user &&
			user.userId &&
			user.email &&
			!isIdentifiedUser
		) {
			setLocalStorageApi(LOCALSTORAGE.IS_IDENTIFIED_USER, 'true');

			window.analytics.identify(user?.email, {
				email: user?.email,
				name: user?.name,
			});

			window.clarity('identify', user.email, user.name);
		}

		if (isOnBasicPlan || (isLoggedInState && role && role !== 'ADMIN')) {
			const newRoutes = routes.filter((route) => route?.path !== ROUTES.BILLING);
			setRoutes(newRoutes);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoggedInState, isOnBasicPlan, user]);

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
								<DashboardProvider>
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
								</DashboardProvider>
							</QueryBuilderProvider>
						</ResourceProvider>
					</PrivateRoute>
				</NotificationProvider>
			</Router>
		</ConfigProvider>
	);
}

export default App;
