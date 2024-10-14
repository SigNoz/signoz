import { ConfigProvider } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import AppLayout from 'container/AppLayout';
import useAnalytics from 'hooks/analytics/useAnalytics';
import { KeyboardHotkeysProvider } from 'hooks/hotkeys/useKeyboardHotkeys';
import { useIsDarkMode, useThemeConfig } from 'hooks/useDarkMode';
import { THEME_MODE } from 'hooks/useDarkMode/constant';
import useFeatureFlags from 'hooks/useFeatureFlag';
import useGetFeatureFlag from 'hooks/useGetFeatureFlag';
import useLicense, { LICENSE_PLAN_KEY } from 'hooks/useLicense';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import history from 'lib/history';
import { identity, pick, pickBy } from 'lodash-es';
import posthog from 'posthog-js';
import AlertRuleProvider from 'providers/Alert';
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

import PrivateRoute from './Private';
import defaultRoutes, {
	AppRoutes,
	LIST_LICENSES,
	SUPPORT_ROUTE,
} from './routes';

function App(): JSX.Element {
	const themeConfig = useThemeConfig();
	const { data: licenseData } = useLicense();
	const [routes, setRoutes] = useState<AppRoutes[]>(defaultRoutes);
	const { role, isLoggedIn: isLoggedInState, user, org } = useSelector<
		AppState,
		AppReducer
	>((state) => state.app);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const { trackPageView } = useAnalytics();

	const { hostname, pathname } = window.location;

	const isCloudUserVal = isCloudUser();

	const isDarkMode = useIsDarkMode();

	const isChatSupportEnabled =
		useFeatureFlags(FeatureKeys.CHAT_SUPPORT)?.active || false;

	const isPremiumSupportEnabled =
		useFeatureFlags(FeatureKeys.PREMIUM_SUPPORT)?.active || false;

	const featureResponse = useGetFeatureFlag((allFlags) => {
		dispatch({
			type: UPDATE_FEATURE_FLAG_RESPONSE,
			payload: {
				featureFlag: allFlags,
				refetch: featureResponse.refetch,
			},
		});

		const isOnboardingEnabled =
			allFlags.find((flag) => flag.name === FeatureKeys.ONBOARDING)?.active ||
			false;

		if (!isOnboardingEnabled || !isCloudUserVal) {
			const newRoutes = routes.filter(
				(route) => route?.path !== ROUTES.GET_STARTED,
			);

			setRoutes(newRoutes);
		}
	});

	const isOnBasicPlan =
		licenseData?.payload?.licenses?.some(
			(license) =>
				license.isCurrent && license.planKey === LICENSE_PLAN_KEY.BASIC_PLAN,
		) || licenseData?.payload?.licenses === null;

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

		posthog?.identify(email, {
			email,
			name,
			orgName,
			tenant_id: hostNameParts[0],
			data_region: hostNameParts[1],
			tenant_url: hostname,
			company_domain: domain,
			source: 'signoz-ui',
			isPaidUser: !!licenseData?.payload?.trialConvertedToSubscription,
		});

		posthog?.group('company', domain, {
			name: orgName,
			tenant_id: hostNameParts[0],
			data_region: hostNameParts[1],
			tenant_url: hostname,
			company_domain: domain,
			source: 'signoz-ui',
			isPaidUser: !!licenseData?.payload?.trialConvertedToSubscription,
		});
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
		}

		if (
			isOnBasicPlan ||
			(isLoggedInState && role && role !== 'ADMIN') ||
			!(isCloudUserVal || isEECloudUser())
		) {
			const newRoutes = routes.filter((route) => route?.path !== ROUTES.BILLING);
			setRoutes(newRoutes);
		}

		if (isCloudUserVal || isEECloudUser()) {
			const newRoutes = [...routes, SUPPORT_ROUTE];

			setRoutes(newRoutes);
		} else {
			const newRoutes = [...routes, LIST_LICENSES];

			setRoutes(newRoutes);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoggedInState, isOnBasicPlan, user]);

	useEffect(() => {
		trackPageView(pathname);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname]);

	useEffect(() => {
		const showAddCreditCardModal =
			!isPremiumSupportEnabled &&
			!licenseData?.payload?.trialConvertedToSubscription;

		if (isLoggedInState && isChatSupportEnabled && !showAddCreditCardModal) {
			window.Intercom('boot', {
				app_id: process.env.INTERCOM_APP_ID,
				email: user?.email || '',
				name: user?.name || '',
			});
		}
	}, [
		isLoggedInState,
		isChatSupportEnabled,
		user,
		licenseData,
		isPremiumSupportEnabled,
	]);

	useEffect(() => {
		if (user && user?.email && user?.userId && user?.name) {
			try {
				const isThemeAnalyticsSent = getLocalStorageApi(
					LOCALSTORAGE.THEME_ANALYTICS_V1,
				);
				if (!isThemeAnalyticsSent) {
					logEvent('Theme Analytics', {
						theme: isDarkMode ? THEME_MODE.DARK : THEME_MODE.LIGHT,
						user: pick(user, ['email', 'userId', 'name']),
						org,
					});
					setLocalStorageApi(LOCALSTORAGE.THEME_ANALYTICS_V1, 'true');
				}
			} catch {
				console.error('Failed to parse local storage theme analytics event');
			}
		}

		if (isCloudUserVal && user && user.email) {
			enableAnalytics(user);
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	useEffect(() => {
		console.info('We are hiring! https://jobs.gem.com/signoz');
	}, []);

	return (
		<ConfigProvider theme={themeConfig}>
			<Router history={history}>
				<NotificationProvider>
					<PrivateRoute>
						<ResourceProvider>
							<QueryBuilderProvider>
								<DashboardProvider>
									<KeyboardHotkeysProvider>
										<AlertRuleProvider>
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
										</AlertRuleProvider>
									</KeyboardHotkeysProvider>
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
