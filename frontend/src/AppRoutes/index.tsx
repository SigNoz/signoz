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
import { identity, pickBy } from 'lodash-es';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import { Suspense, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Router, Switch } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_FEATURE_FLAG_RESPONSE } from 'types/actions/app';
import AppReducer, { User } from 'types/reducer/app';
import { extractDomain, isCloudUser, isEECloudUser } from 'utils/app';
import { trackPageView } from 'utils/segmentAnalytics';

import PrivateRoute from './Private';
import defaultRoutes, { AppRoutes, SUPPORT_ROUTE } from './routes';

function App(): JSX.Element {
	const themeConfig = useThemeConfig();
	const { data } = useLicense();
	const [routes, setRoutes] = useState<AppRoutes[]>(defaultRoutes);
	const { role, isLoggedIn: isLoggedInState, user, org } = useSelector<
		AppState,
		AppReducer
	>((state) => state.app);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { hostname, pathname } = window.location;

	const isCloudUserVal = isCloudUser();

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

		if (!isOnboardingEnabled || !isCloudUserVal) {
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

	const enableAnalytics = (user: User): void => {
		const orgName =
			org && Array.isArray(org) && org.length > 0 ? org[0].name : '';

		const { name, email } = user;

		const identifyPayload = {
			email,
			name,
			company_name: orgName,
			role,
			source: 'signoz-ui',
		};

		const sanitizedIdentifyPayload = pickBy(identifyPayload, identity);

		const domain = extractDomain(email);

		const hostNameParts = hostname.split('.');

		const groupTraits = {
			name: orgName,
			tenant_id: hostNameParts[0],
			data_region: hostNameParts[1],
			tenant_url: hostname,
			company_domain: domain,
			source: 'signoz-ui',
		};

		window.analytics.identify(email, sanitizedIdentifyPayload);

		window.analytics.group(domain, groupTraits);

		window.clarity('identify', email, name);
	};

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

			if (isCloudUserVal) {
				enableAnalytics(user);
			}
		}

		if (isOnBasicPlan || (isLoggedInState && role && role !== 'ADMIN')) {
			const newRoutes = routes.filter((route) => route?.path !== ROUTES.BILLING);
			setRoutes(newRoutes);
		}

		if (isCloudUserVal || isEECloudUser()) {
			const newRoutes = [...routes, SUPPORT_ROUTE];

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
