import * as Sentry from '@sentry/react';
import { ConfigProvider } from 'antd';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import AppLoading from 'components/AppLoading/AppLoading';
import KBarCommandPalette from 'components/KBarCommandPalette/KBarCommandPalette';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import AppLayout from 'container/AppLayout';
import Hex from 'crypto-js/enc-hex';
import HmacSHA256 from 'crypto-js/hmac-sha256';
import { KeyboardHotkeysProvider } from 'hooks/hotkeys/useKeyboardHotkeys';
import { useThemeConfig } from 'hooks/useDarkMode';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import { StatusCodes } from 'http-status-codes';
import history from 'lib/history';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import posthog from 'posthog-js';
import AlertRuleProvider from 'providers/Alert';
import { useAppContext } from 'providers/App/App';
import { IUser } from 'providers/App/types';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { ErrorModalProvider } from 'providers/ErrorModalProvider';
import { KBarCommandPaletteProvider } from 'providers/KBarCommandPaletteProvider';
import { PreferenceContextProvider } from 'providers/preferences/context/PreferenceContextProvider';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { LicenseStatus } from 'types/api/licensesV3/getActive';
import { extractDomain } from 'utils/app';

import { Home } from './pageComponents';
import PrivateRoute from './Private';
import defaultRoutes, {
	AppRoutes,
	LIST_LICENSES,
	SUPPORT_ROUTE,
} from './routes';

function App(): JSX.Element {
	const themeConfig = useThemeConfig();
	const {
		user,
		isFetchingUser,
		isFetchingFeatureFlags,
		trialInfo,
		activeLicense,
		isFetchingActiveLicense,
		activeLicenseFetchError,
		userFetchError,
		featureFlagsFetchError,
		isLoggedIn: isLoggedInState,
		featureFlags,
		org,
	} = useAppContext();
	const [routes, setRoutes] = useState<AppRoutes[]>(defaultRoutes);

	const { hostname, pathname } = window.location;

	const { isCloudUser, isEnterpriseSelfHostedUser } = useGetTenantLicense();

	const [isSentryInitialized, setIsSentryInitialized] = useState(false);

	const enableAnalytics = useCallback(
		(user: IUser): void => {
			// wait for the required data to be loaded before doing init for anything!
			if (!isFetchingActiveLicense && activeLicense && org) {
				const orgName =
					org && Array.isArray(org) && org.length > 0 ? org[0].displayName : '';

				const { displayName, email, role, id, orgId } = user;

				const domain = extractDomain(email);
				const hostNameParts = hostname.split('.');

				const identifyPayload = {
					email,
					name: displayName,
					company_name: orgName,
					deployment_name: hostNameParts[0],
					data_region: hostNameParts[1],
					deployment_url: hostname,
					company_domain: domain,
					source: 'signoz-ui',
					role,
				};

				const groupTraits = {
					name: orgName,
					deployment_name: hostNameParts[0],
					data_region: hostNameParts[1],
					deployment_url: hostname,
					company_domain: domain,
					source: 'signoz-ui',
				};

				if (email) {
					logEvent('Email Identified', identifyPayload, 'identify');
				}

				if (domain) {
					logEvent('Domain Identified', groupTraits, 'group');
				}
				if (window && window.Appcues) {
					window.Appcues.identify(id, {
						name: displayName,
						deployment_name: hostNameParts[0],
						data_region: hostNameParts[1],
						deployment_url: hostname,
						company_domain: domain,
						companyName: orgName,
						email,
						paidUser: !!trialInfo?.trialConvertedToSubscription,
					});
				}

				posthog?.identify(id, {
					email,
					name: displayName,
					orgName,
					deployment_name: hostNameParts[0],
					data_region: hostNameParts[1],
					deployment_url: hostname,
					company_domain: domain,
					source: 'signoz-ui',
					isPaidUser: !!trialInfo?.trialConvertedToSubscription,
				});

				posthog?.group('company', orgId, {
					name: orgName,
					deployment_name: hostNameParts[0],
					data_region: hostNameParts[1],
					deployment_url: hostname,
					company_domain: domain,
					source: 'signoz-ui',
					isPaidUser: !!trialInfo?.trialConvertedToSubscription,
				});
			}
		},
		[
			hostname,
			isFetchingActiveLicense,
			activeLicense,
			org,
			trialInfo?.trialConvertedToSubscription,
		],
	);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		if (
			!isFetchingActiveLicense &&
			(activeLicense || activeLicenseFetchError) &&
			!isFetchingUser &&
			user &&
			!!user.email
		) {
			// either the active API returns error with 404 or 501 and if it returns a terminated license means it's on basic plan
			const isOnBasicPlan =
				(activeLicenseFetchError &&
					[StatusCodes.NOT_FOUND, StatusCodes.NOT_IMPLEMENTED].includes(
						activeLicenseFetchError?.getHttpStatusCode(),
					)) ||
				(activeLicense?.status && activeLicense.status === LicenseStatus.INVALID);
			const isIdentifiedUser = getLocalStorageApi(LOCALSTORAGE.IS_IDENTIFIED_USER);

			if (isLoggedInState && user && user.id && user.email && !isIdentifiedUser) {
				setLocalStorageApi(LOCALSTORAGE.IS_IDENTIFIED_USER, 'true');
			}

			let updatedRoutes = defaultRoutes;
			// if the user is a cloud user
			if (isCloudUser || isEnterpriseSelfHostedUser) {
				// if the user is on basic plan then remove billing
				if (isOnBasicPlan) {
					updatedRoutes = updatedRoutes.filter(
						(route) =>
							route?.path !== ROUTES.BILLING && route?.path !== ROUTES.INTEGRATIONS,
					);
				}

				if (isEnterpriseSelfHostedUser) {
					updatedRoutes.push(LIST_LICENSES);
				}

				// always add support route for cloud users
				updatedRoutes = [...updatedRoutes, SUPPORT_ROUTE];
			} else {
				// if not a cloud user then remove billing and add list licenses route
				updatedRoutes = updatedRoutes.filter(
					(route) =>
						route?.path !== ROUTES.BILLING && route?.path !== ROUTES.INTEGRATIONS,
				);
				updatedRoutes = [...updatedRoutes, LIST_LICENSES];
			}
			setRoutes(updatedRoutes);
		}
	}, [
		isLoggedInState,
		user,
		isCloudUser,
		isEnterpriseSelfHostedUser,
		isFetchingActiveLicense,
		isFetchingUser,
		activeLicense,
		activeLicenseFetchError,
	]);

	useEffect(() => {
		if (pathname === ROUTES.ONBOARDING) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			window.Pylon('hideChatBubble');
		} else {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			window.Pylon('showChatBubble');
		}
	}, [pathname]);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		// feature flag shouldn't be loading and featureFlags or fetchError any one of this should be true indicating that req is complete
		// licenses should also be present. there is no check for licenses for loading and error as that is mandatory if not present then routing
		// to something went wrong which would ideally need a reload.
		if (
			!isFetchingFeatureFlags &&
			(featureFlags || featureFlagsFetchError) &&
			activeLicense &&
			trialInfo
		) {
			let isChatSupportEnabled = false;
			let isPremiumSupportEnabled = false;
			if (featureFlags && featureFlags.length > 0) {
				isChatSupportEnabled =
					featureFlags.find((flag) => flag.name === FeatureKeys.CHAT_SUPPORT)
						?.active || false;

				isPremiumSupportEnabled =
					featureFlags.find((flag) => flag.name === FeatureKeys.PREMIUM_SUPPORT)
						?.active || false;
			}
			const showAddCreditCardModal =
				!isPremiumSupportEnabled && !trialInfo?.trialConvertedToSubscription;

			if (
				isLoggedInState &&
				isChatSupportEnabled &&
				!showAddCreditCardModal &&
				(isCloudUser || isEnterpriseSelfHostedUser)
			) {
				const email = user.email || '';
				const secret = process.env.PYLON_IDENTITY_SECRET || '';
				let emailHash = '';

				if (email && secret) {
					emailHash = HmacSHA256(email, Hex.parse(secret)).toString(Hex);
				}

				window.pylon = {
					chat_settings: {
						app_id: process.env.PYLON_APP_ID,
						email: user.email,
						name: user.displayName || user.email,
						email_hash: emailHash,
					},
				};
			}
		}
	}, [
		isLoggedInState,
		user,
		pathname,
		trialInfo?.trialConvertedToSubscription,
		featureFlags,
		isFetchingFeatureFlags,
		featureFlagsFetchError,
		activeLicense,
		trialInfo,
		isCloudUser,
		isEnterpriseSelfHostedUser,
	]);

	useEffect(() => {
		if (!isFetchingUser && isCloudUser && user && user.email) {
			enableAnalytics(user);
		}
	}, [user, isFetchingUser, isCloudUser, enableAnalytics]);

	useEffect(() => {
		if (isCloudUser || isEnterpriseSelfHostedUser) {
			if (process.env.POSTHOG_KEY) {
				posthog.init(process.env.POSTHOG_KEY, {
					api_host: 'https://us.i.posthog.com',
					person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
				});
			}

			if (!isSentryInitialized) {
				Sentry.init({
					dsn: process.env.SENTRY_DSN,
					tunnel: process.env.TUNNEL_URL,
					environment: 'production',
					integrations: [
						Sentry.browserTracingIntegration(),
						Sentry.replayIntegration({
							maskAllText: false,
							blockAllMedia: false,
						}),
					],
					// Performance Monitoring
					tracesSampleRate: 1.0, //  Capture 100% of the transactions
					// Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
					tracePropagationTargets: [],
					// Session Replay
					replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
					replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
				});

				setIsSentryInitialized(true);
			}
		} else {
			posthog.reset();
			Sentry.close();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isCloudUser, isEnterpriseSelfHostedUser]);

	// if the user is in logged in state
	if (isLoggedInState) {
		// if the setup calls are loading then return a spinner
		if (isFetchingActiveLicense || isFetchingUser || isFetchingFeatureFlags) {
			return <AppLoading />;
		}

		// if the required calls fails then return a something went wrong error
		// this needs to be on top of data missing error because if there is an error, data will never be loaded and it will
		// move to indefinitive loading
		if (userFetchError && pathname !== ROUTES.SOMETHING_WENT_WRONG) {
			history.replace(ROUTES.SOMETHING_WENT_WRONG);
		}

		// if all of the data is not set then return a spinner, this is required because there is some gap between loading states and data setting
		if (
			(!activeLicense || !user.email || !featureFlags) &&
			!userFetchError &&
			!activeLicenseFetchError
		) {
			return <Spinner tip="Loading..." />;
		}
	}

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<ConfigProvider theme={themeConfig}>
				<Router history={history}>
					<CompatRouter>
						<KBarCommandPaletteProvider>
							<KBarCommandPalette />
							<NotificationProvider>
								<ErrorModalProvider>
									<PrivateRoute>
										<ResourceProvider>
											<QueryBuilderProvider>
												<DashboardProvider>
													<KeyboardHotkeysProvider>
														<AlertRuleProvider>
															<AppLayout>
																<PreferenceContextProvider>
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
																			<Route exact path="/" component={Home} />
																			<Route path="*" component={NotFound} />
																		</Switch>
																	</Suspense>
																</PreferenceContextProvider>
															</AppLayout>
														</AlertRuleProvider>
													</KeyboardHotkeysProvider>
												</DashboardProvider>
											</QueryBuilderProvider>
										</ResourceProvider>
									</PrivateRoute>
								</ErrorModalProvider>
							</NotificationProvider>
						</KBarCommandPaletteProvider>
					</CompatRouter>
				</Router>
			</ConfigProvider>
		</Sentry.ErrorBoundary>
	);
}

export default App;
