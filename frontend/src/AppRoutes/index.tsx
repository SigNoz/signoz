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
import { KeyboardHotkeysProvider } from 'hooks/hotkeys/useKeyboardHotkeys';
import { useThemeConfig } from 'hooks/useDarkMode';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { LICENSE_PLAN_KEY } from 'hooks/useLicense';
import { NotificationProvider } from 'hooks/useNotifications';
import { ResourceProvider } from 'hooks/useResourceAttribute';
import history from 'lib/history';
import posthog from 'posthog-js';
import AlertRuleProvider from 'providers/Alert';
import { useAppContext } from 'providers/App/App';
import { IUser } from 'providers/App/types';
import { DashboardProvider } from 'providers/Dashboard/Dashboard';
import { QueryBuilderProvider } from 'providers/QueryBuilder';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { CompatRouter } from 'react-router-dom-v5-compat';
import { extractDomain } from 'utils/app';

import PrivateRoute from './Private';
import defaultRoutes, {
	AppRoutes,
	LIST_LICENSES,
	SUPPORT_ROUTE,
} from './routes';

function App(): JSX.Element {
	const themeConfig = useThemeConfig();
	const {
		licenses,
		user,
		isFetchingUser,
		isFetchingLicenses,
		isFetchingFeatureFlags,
		trialInfo,
		activeLicenseV3,
		isFetchingActiveLicenseV3,
		userFetchError,
		licensesFetchError,
		featureFlagsFetchError,
		isLoggedIn: isLoggedInState,
		featureFlags,
		org,
	} = useAppContext();
	const [routes, setRoutes] = useState<AppRoutes[]>(defaultRoutes);

	const { hostname, pathname } = window.location;

	const {
		isCloudUser: isCloudUserVal,
		isEECloudUser: isEECloudUserVal,
	} = useGetTenantLicense();

	const enableAnalytics = useCallback(
		(user: IUser): void => {
			// wait for the required data to be loaded before doing init for anything!
			if (!isFetchingActiveLicenseV3 && activeLicenseV3 && org) {
				const orgName =
					org && Array.isArray(org) && org.length > 0 ? org[0].name : '';

				const { name, email, role } = user;

				const domain = extractDomain(email);
				const hostNameParts = hostname.split('.');

				const identifyPayload = {
					email,
					name,
					company_name: orgName,
					tenant_id: hostNameParts[0],
					data_region: hostNameParts[1],
					tenant_url: hostname,
					company_domain: domain,
					source: 'signoz-ui',
					role,
				};

				const groupTraits = {
					name: orgName,
					tenant_id: hostNameParts[0],
					data_region: hostNameParts[1],
					tenant_url: hostname,
					company_domain: domain,
					source: 'signoz-ui',
				};

				if (email) {
					logEvent('Email Identified', identifyPayload, 'identify');
				}

				if (domain) {
					logEvent('Domain Identified', groupTraits, 'group');
				}

				posthog?.identify(email, {
					email,
					name,
					orgName,
					tenant_id: hostNameParts[0],
					data_region: hostNameParts[1],
					tenant_url: hostname,
					company_domain: domain,
					source: 'signoz-ui',
					isPaidUser: !!trialInfo?.trialConvertedToSubscription,
				});

				posthog?.group('company', domain, {
					name: orgName,
					tenant_id: hostNameParts[0],
					data_region: hostNameParts[1],
					tenant_url: hostname,
					company_domain: domain,
					source: 'signoz-ui',
					isPaidUser: !!trialInfo?.trialConvertedToSubscription,
				});

				if (
					window.cioanalytics &&
					typeof window.cioanalytics.identify === 'function'
				) {
					window.cioanalytics.reset();
					window.cioanalytics.identify(email, {
						name: user.name,
						email,
						role: user.role,
					});
				}
			}
		},
		[
			hostname,
			isFetchingActiveLicenseV3,
			activeLicenseV3,
			org,
			trialInfo?.trialConvertedToSubscription,
		],
	);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	useEffect(() => {
		if (
			!isFetchingLicenses &&
			licenses &&
			!isFetchingUser &&
			user &&
			!!user.email
		) {
			const isOnBasicPlan =
				licenses.licenses?.some(
					(license) =>
						license.isCurrent && license.planKey === LICENSE_PLAN_KEY.BASIC_PLAN,
				) || licenses.licenses === null;

			const isIdentifiedUser = getLocalStorageApi(LOCALSTORAGE.IS_IDENTIFIED_USER);

			if (isLoggedInState && user && user.id && user.email && !isIdentifiedUser) {
				setLocalStorageApi(LOCALSTORAGE.IS_IDENTIFIED_USER, 'true');
			}

			let updatedRoutes = defaultRoutes;
			// if the user is a cloud user
			if (isCloudUserVal || isEECloudUserVal) {
				// if the user is on basic plan then remove billing
				if (isOnBasicPlan) {
					updatedRoutes = updatedRoutes.filter(
						(route) => route?.path !== ROUTES.BILLING,
					);
				}
				// always add support route for cloud users
				updatedRoutes = [...updatedRoutes, SUPPORT_ROUTE];
			} else {
				// if not a cloud user then remove billing and add list licenses route
				updatedRoutes = updatedRoutes.filter(
					(route) => route?.path !== ROUTES.BILLING,
				);
				updatedRoutes = [...updatedRoutes, LIST_LICENSES];
			}
			setRoutes(updatedRoutes);
		}
	}, [
		isLoggedInState,
		user,
		licenses,
		isCloudUserVal,
		isFetchingLicenses,
		isFetchingUser,
		isEECloudUserVal,
	]);

	useEffect(() => {
		if (pathname === ROUTES.ONBOARDING) {
			window.Intercom('update', {
				hide_default_launcher: true,
			});
		} else {
			window.Intercom('update', {
				hide_default_launcher: false,
			});
		}
	}, [pathname]);

	useEffect(() => {
		// feature flag shouldn't be loading and featureFlags or fetchError any one of this should be true indicating that req is complete
		// licenses should also be present. there is no check for licenses for loading and error as that is mandatory if not present then routing
		// to something went wrong which would ideally need a reload.
		if (
			!isFetchingFeatureFlags &&
			(featureFlags || featureFlagsFetchError) &&
			licenses &&
			activeLicenseV3 &&
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

			if (isLoggedInState && isChatSupportEnabled && !showAddCreditCardModal) {
				window.Intercom('boot', {
					app_id: process.env.INTERCOM_APP_ID,
					email: user?.email || '',
					name: user?.name || '',
				});
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
		licenses,
		activeLicenseV3,
		trialInfo,
	]);

	useEffect(() => {
		if (!isFetchingUser && isCloudUserVal && user && user.email) {
			enableAnalytics(user);
		}
	}, [user, isFetchingUser, isCloudUserVal, enableAnalytics]);

	// if the user is in logged in state
	if (isLoggedInState) {
		// if the setup calls are loading then return a spinner
		if (isFetchingLicenses || isFetchingUser || isFetchingFeatureFlags) {
			return <Spinner tip="Loading..." />;
		}

		// if the required calls fails then return a something went wrong error
		// this needs to be on top of data missing error because if there is an error, data will never be loaded and it will
		// move to indefinitive loading
		if (
			(userFetchError || licensesFetchError) &&
			pathname !== ROUTES.SOMETHING_WENT_WRONG
		) {
			history.replace(ROUTES.SOMETHING_WENT_WRONG);
		}

		// if all of the data is not set then return a spinner, this is required because there is some gap between loading states and data setting
		if (
			(!licenses || !user.email || !featureFlags) &&
			!userFetchError &&
			!licensesFetchError
		) {
			return <Spinner tip="Loading..." />;
		}
	}

	return (
		<ConfigProvider theme={themeConfig}>
			<Router history={history}>
				<CompatRouter>
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
				</CompatRouter>
			</Router>
		</ConfigProvider>
	);
}

export default App;
