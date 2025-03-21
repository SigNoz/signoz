/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import './AppLayout.styles.scss';

import * as Sentry from '@sentry/react';
import { Flex } from 'antd';
import manageCreditCardApi from 'api/billing/manage';
import getLocalStorageApi from 'api/browser/localstorage/get';
import setLocalStorageApi from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import getUserLatestVersion from 'api/user/getLatestVersion';
import getUserVersion from 'api/user/getVersion';
import cx from 'classnames';
import ChatSupportGateway from 'components/ChatSupportGateway/ChatSupportGateway';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { Events } from 'constants/events';
import { FeatureKeys } from 'constants/features';
import { LOCALSTORAGE } from 'constants/localStorage';
import ROUTES from 'constants/routes';
import SideNav from 'container/SideNav';
import TopNav from 'container/TopNav';
import dayjs from 'dayjs';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { useGetTenantLicense } from 'hooks/useGetTenantLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { isNull } from 'lodash-es';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { INTEGRATION_TYPES } from 'pages/Integrations/utils';
import { useAppContext } from 'providers/App/App';
import {
	ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueries } from 'react-query';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import {
	UPDATE_CURRENT_ERROR,
	UPDATE_CURRENT_VERSION,
	UPDATE_LATEST_VERSION,
	UPDATE_LATEST_VERSION_ERROR,
} from 'types/actions/app';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { CheckoutSuccessPayloadProps } from 'types/api/billing/checkout';
import {
	LicenseEvent,
	LicensePlatform,
	LicenseState,
} from 'types/api/licensesV3/getActive';
import { USER_ROLES } from 'types/roles';
import { eventEmitter } from 'utils/getEventEmitter';
import {
	getFormattedDate,
	getFormattedDateWithMinutes,
	getRemainingDays,
} from 'utils/timeUtils';

import { ChildrenContainer, Layout, LayoutContent } from './styles';
import { getRouteKey } from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function AppLayout(props: AppLayoutProps): JSX.Element {
	const {
		isLoggedIn,
		user,
		trialInfo,
		activeLicenseV3,
		isFetchingActiveLicenseV3,
		featureFlags,
		isFetchingFeatureFlags,
		featureFlagsFetchError,
	} = useAppContext();

	const { notifications } = useNotifications();

	const [
		showPaymentFailedWarning,
		setShowPaymentFailedWarning,
	] = useState<boolean>(false);

	const [showSlowApiWarning, setShowSlowApiWarning] = useState(false);
	const [slowApiWarningShown, setSlowApiWarningShown] = useState(false);

	const handleBillingOnSuccess = (
		data: ErrorResponse | SuccessResponse<CheckoutSuccessPayloadProps, unknown>,
	): void => {
		if (data?.payload?.redirectURL) {
			const newTab = document.createElement('a');
			newTab.href = data.payload.redirectURL;
			newTab.target = '_blank';
			newTab.rel = 'noopener noreferrer';
			newTab.click();
		}
	};

	const handleBillingOnError = (): void => {
		notifications.error({
			message: SOMETHING_WENT_WRONG,
		});
	};

	const {
		mutate: manageCreditCard,
		isLoading: isLoadingManageBilling,
	} = useMutation(manageCreditCardApi, {
		onSuccess: (data) => {
			handleBillingOnSuccess(data);
		},
		onError: handleBillingOnError,
	});

	const isDarkMode = useIsDarkMode();

	const { pathname } = useLocation();
	const { t } = useTranslation(['titles']);

	const { isCloudUser: isCloudUserVal } = useGetTenantLicense();

	const [getUserVersionResponse, getUserLatestVersionResponse] = useQueries([
		{
			queryFn: getUserVersion,
			queryKey: ['getUserVersion', user?.accessJwt],
			enabled: isLoggedIn,
		},
		{
			queryFn: getUserLatestVersion,
			queryKey: ['getUserLatestVersion', user?.accessJwt],
			enabled: isLoggedIn,
		},
	]);

	useEffect(() => {
		if (getUserLatestVersionResponse.status === 'idle' && isLoggedIn) {
			getUserLatestVersionResponse.refetch();
		}

		if (getUserVersionResponse.status === 'idle' && isLoggedIn) {
			getUserVersionResponse.refetch();
		}
	}, [getUserLatestVersionResponse, getUserVersionResponse, isLoggedIn]);

	const { children } = props;

	const dispatch = useDispatch<Dispatch<AppActions | any>>();

	const latestCurrentCounter = useRef(0);
	const latestVersionCounter = useRef(0);

	useEffect(() => {
		if (
			getUserLatestVersionResponse.isFetched &&
			getUserLatestVersionResponse.isError &&
			latestCurrentCounter.current === 0
		) {
			latestCurrentCounter.current = 1;

			dispatch({
				type: UPDATE_LATEST_VERSION_ERROR,
				payload: {
					isError: true,
				},
			});
			notifications.error({
				message: t('oops_something_went_wrong_version'),
			});
		}

		if (
			getUserVersionResponse.isFetched &&
			getUserVersionResponse.isError &&
			latestVersionCounter.current === 0
		) {
			latestVersionCounter.current = 1;

			dispatch({
				type: UPDATE_CURRENT_ERROR,
				payload: {
					isError: true,
				},
			});
			notifications.error({
				message: t('oops_something_went_wrong_version'),
			});
		}

		if (
			getUserVersionResponse.isFetched &&
			getUserLatestVersionResponse.isSuccess &&
			getUserVersionResponse.data &&
			getUserVersionResponse.data.payload
		) {
			dispatch({
				type: UPDATE_CURRENT_VERSION,
				payload: {
					currentVersion: getUserVersionResponse.data.payload.version,
					ee: getUserVersionResponse.data.payload.ee,
					setupCompleted: getUserVersionResponse.data.payload.setupCompleted,
				},
			});
		}

		if (
			getUserLatestVersionResponse.isFetched &&
			getUserLatestVersionResponse.isSuccess &&
			getUserLatestVersionResponse.data &&
			getUserLatestVersionResponse.data.payload
		) {
			dispatch({
				type: UPDATE_LATEST_VERSION,
				payload: {
					latestVersion: getUserLatestVersionResponse.data.payload.tag_name,
				},
			});
		}
	}, [
		dispatch,
		isLoggedIn,
		pathname,
		t,
		getUserLatestVersionResponse.isLoading,
		getUserLatestVersionResponse.isError,
		getUserLatestVersionResponse.data,
		getUserVersionResponse.isLoading,
		getUserVersionResponse.isError,
		getUserVersionResponse.data,
		getUserLatestVersionResponse.isFetched,
		getUserVersionResponse.isFetched,
		getUserLatestVersionResponse.isSuccess,
		notifications,
	]);

	const isToDisplayLayout = isLoggedIn;

	const routeKey = useMemo(() => getRouteKey(pathname), [pathname]);
	const pageTitle = t(routeKey);
	const renderFullScreen =
		pathname === ROUTES.GET_STARTED ||
		pathname === ROUTES.ONBOARDING ||
		pathname === ROUTES.GET_STARTED_WITH_CLOUD ||
		pathname === ROUTES.GET_STARTED_APPLICATION_MONITORING ||
		pathname === ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING ||
		pathname === ROUTES.GET_STARTED_LOGS_MANAGEMENT ||
		pathname === ROUTES.GET_STARTED_AWS_MONITORING ||
		pathname === ROUTES.GET_STARTED_AZURE_MONITORING;

	const [showTrialExpiryBanner, setShowTrialExpiryBanner] = useState(false);

	const [showWorkspaceRestricted, setShowWorkspaceRestricted] = useState(false);

	useEffect(() => {
		if (
			!isFetchingActiveLicenseV3 &&
			activeLicenseV3 &&
			trialInfo?.onTrial &&
			!trialInfo?.trialConvertedToSubscription &&
			!trialInfo?.workSpaceBlock &&
			getRemainingDays(trialInfo?.trialEnd) < 7
		) {
			setShowTrialExpiryBanner(true);
		}
	}, [isFetchingActiveLicenseV3, activeLicenseV3, trialInfo]);

	useEffect(() => {
		if (!isFetchingActiveLicenseV3 && activeLicenseV3) {
			const isTerminated = activeLicenseV3.state === LicenseState.TERMINATED;
			const isExpired = activeLicenseV3.state === LicenseState.EXPIRED;
			const isCancelled = activeLicenseV3.state === LicenseState.CANCELLED;
			const isDefaulted = activeLicenseV3.state === LicenseState.DEFAULTED;
			const isEvaluationExpired =
				activeLicenseV3.state === LicenseState.EVALUATION_EXPIRED;

			const isWorkspaceAccessRestricted =
				isTerminated ||
				isExpired ||
				isCancelled ||
				isDefaulted ||
				isEvaluationExpired;

			const { platform } = activeLicenseV3;

			if (
				isWorkspaceAccessRestricted &&
				platform === LicensePlatform.SELF_HOSTED
			) {
				setShowWorkspaceRestricted(true);
			}
		}
	}, [isFetchingActiveLicenseV3, activeLicenseV3]);

	useEffect(() => {
		if (
			!isFetchingActiveLicenseV3 &&
			!isNull(activeLicenseV3) &&
			activeLicenseV3?.event_queue?.event === LicenseEvent.DEFAULT
		) {
			setShowPaymentFailedWarning(true);
		}
	}, [activeLicenseV3, isFetchingActiveLicenseV3]);

	useEffect(() => {
		// after logging out hide the trial expiry banner
		if (!isLoggedIn) {
			setShowTrialExpiryBanner(false);
			setShowPaymentFailedWarning(false);
			setShowSlowApiWarning(false);
		}
	}, [isLoggedIn]);

	const handleUpgrade = useCallback((): void => {
		if (user.role === USER_ROLES.ADMIN) {
			history.push(ROUTES.BILLING);
		}
	}, [user.role]);

	const handleFailedPayment = useCallback((): void => {
		manageCreditCard({
			url: window.location.origin,
		});
	}, [manageCreditCard]);

	const isHome = (): boolean => routeKey === 'HOME';

	const isLogsView = (): boolean =>
		routeKey === 'LOGS' ||
		routeKey === 'LOGS_EXPLORER' ||
		routeKey === 'LOGS_PIPELINES' ||
		routeKey === 'LOGS_SAVE_VIEWS';

	const isTracesView = (): boolean =>
		routeKey === 'TRACES_EXPLORER' || routeKey === 'TRACES_SAVE_VIEWS';

	const isMessagingQueues = (): boolean =>
		routeKey === 'MESSAGING_QUEUES_KAFKA' ||
		routeKey === 'MESSAGING_QUEUES_KAFKA_DETAIL' ||
		routeKey === 'MESSAGING_QUEUES_CELERY_TASK' ||
		routeKey === 'MESSAGING_QUEUES_OVERVIEW';

	const isCloudIntegrationPage = (): boolean =>
		routeKey === 'INTEGRATIONS' &&
		new URLSearchParams(window.location.search).get('integration') ===
			INTEGRATION_TYPES.AWS_INTEGRATION;

	const isDashboardListView = (): boolean => routeKey === 'ALL_DASHBOARD';
	const isAlertHistory = (): boolean => routeKey === 'ALERT_HISTORY';
	const isAlertOverview = (): boolean => routeKey === 'ALERT_OVERVIEW';
	const isInfraMonitoring = (): boolean =>
		routeKey === 'INFRASTRUCTURE_MONITORING_HOSTS' ||
		routeKey === 'INFRASTRUCTURE_MONITORING_KUBERNETES';
	const isPathMatch = (regex: RegExp): boolean => regex.test(pathname);

	const isDashboardView = (): boolean =>
		isPathMatch(/^\/dashboard\/[a-zA-Z0-9_-]+$/);

	const isDashboardWidgetView = (): boolean =>
		isPathMatch(/^\/dashboard\/[a-zA-Z0-9_-]+\/new$/);

	const isTraceDetailsView = (): boolean =>
		isPathMatch(/^\/trace\/[a-zA-Z0-9]+(\?.*)?$/);

	useEffect(() => {
		if (isDarkMode) {
			document.body.classList.remove('lightMode');
			document.body.classList.add('darkMode');
		} else {
			document.body.classList.add('lightMode');
			document.body.classList.remove('darkMode');
		}
	}, [isDarkMode]);

	const showAddCreditCardModal = useMemo(() => {
		if (
			!isFetchingFeatureFlags &&
			(featureFlags || featureFlagsFetchError) &&
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
			return (
				isLoggedIn &&
				!isPremiumSupportEnabled &&
				isChatSupportEnabled &&
				!trialInfo?.trialConvertedToSubscription &&
				isCloudUserVal
			);
		}
		return false;
	}, [
		featureFlags,
		featureFlagsFetchError,
		isCloudUserVal,
		isFetchingFeatureFlags,
		isLoggedIn,
		activeLicenseV3,
		trialInfo,
	]);

	// Listen for API warnings
	const handleWarning = (
		isSlow: boolean,
		data: { duration: number; url: string; threshold: number },
	): void => {
		const dontShowSlowApiWarning = getLocalStorageApi(
			LOCALSTORAGE.DONT_SHOW_SLOW_API_WARNING,
		);

		logEvent(
			`Slow API Warning`,
			{
				durationMs: data.duration,
				url: data.url,
				thresholdMs: data.threshold,
			},
			'track',
			true, // rate limited - controlled by Backend
		);

		const isDontShowSlowApiWarning = dontShowSlowApiWarning === 'true';

		if (isDontShowSlowApiWarning) {
			setShowSlowApiWarning(false);
		} else {
			setShowSlowApiWarning(isSlow);
		}
	};

	useEffect(() => {
		eventEmitter.on(Events.SLOW_API_WARNING, handleWarning);

		return (): void => {
			eventEmitter.off(Events.SLOW_API_WARNING, handleWarning);
		};
	}, []);

	const handleDismissSlowApiWarning = (): void => {
		setShowSlowApiWarning(false);

		setLocalStorageApi(LOCALSTORAGE.DONT_SHOW_SLOW_API_WARNING, 'true');
	};

	useEffect(() => {
		if (
			showSlowApiWarning &&
			trialInfo?.onTrial &&
			!trialInfo?.trialConvertedToSubscription &&
			!slowApiWarningShown
		) {
			setSlowApiWarningShown(true);

			notifications.info({
				message: (
					<div>
						Our systems are taking longer than expected for your trial workspace.
						Please{' '}
						{user.role === USER_ROLES.ADMIN ? (
							<span>
								<a
									className="upgrade-link"
									onClick={(): void => {
										notifications.destroy('slow-api-warning');

										logEvent(`Slow API Banner: Upgrade clicked`, {});

										handleUpgrade();
									}}
								>
									upgrade
								</a>
								your workspace for a smoother experience.
							</span>
						) : (
							'contact your administrator for upgrading to a paid plan for a smoother experience.'
						)}
					</div>
				),
				duration: 60000,
				placement: 'topRight',
				onClose: handleDismissSlowApiWarning,
				key: 'slow-api-warning',
			});
		}
	}, [
		showSlowApiWarning,
		notifications,
		user.role,
		isLoadingManageBilling,
		handleFailedPayment,
		slowApiWarningShown,
		handleUpgrade,
		trialInfo?.onTrial,
		trialInfo?.trialConvertedToSubscription,
	]);

	const renderWorkspaceRestrictedBanner = (): JSX.Element => (
		<div className="workspace-restricted-banner">
			{activeLicenseV3?.state === LicenseState.TERMINATED && (
				<>
					Your SigNoz license is terminated, enterprise features have been disabled.
					Please contact support at{' '}
					<a href="mailto:support@signoz.io">support@signoz.io</a> for new license
				</>
			)}
			{activeLicenseV3?.state === LicenseState.EXPIRED && (
				<>
					Your SigNoz license has expired. Please contact support at{' '}
					<a href="mailto:support@signoz.io">support@signoz.io</a> for renewal to
					avoid termination of license as per our{' '}
					<a
						href="https://signoz.io/terms-of-service"
						target="_blank"
						rel="noopener noreferrer"
					>
						terms of service
					</a>
				</>
			)}
			{activeLicenseV3?.state === LicenseState.CANCELLED && (
				<>
					Your SigNoz license is cancelled. Please contact support at{' '}
					<a href="mailto:support@signoz.io">support@signoz.io</a> for reactivation
					to avoid termination of license as per our{' '}
					<a
						href="https://signoz.io/terms-of-service"
						target="_blank"
						rel="noopener noreferrer"
					>
						terms of service
					</a>
				</>
			)}

			{activeLicenseV3?.state === LicenseState.DEFAULTED && (
				<>
					Your SigNoz license is defaulted. Please clear the bill to continue using
					the enterprise features. Contact support at{' '}
					<a href="mailto:support@signoz.io">support@signoz.io</a> to avoid
					termination of license as per our{' '}
					<a
						href="https://signoz.io/terms-of-service"
						target="_blank"
						rel="noopener noreferrer"
					>
						terms of service
					</a>
				</>
			)}

			{activeLicenseV3?.state === LicenseState.EVALUATION_EXPIRED && (
				<>
					Your SigNoz trial has ended. Please contact support at{' '}
					<a href="mailto:support@signoz.io">support@signoz.io</a> for next steps to
					avoid termination of license as per our{' '}
					<a
						href="https://signoz.io/terms-of-service"
						target="_blank"
						rel="noopener noreferrer"
					>
						terms of service
					</a>
				</>
			)}
		</div>
	);

	return (
		<Layout className={cx(isDarkMode ? 'darkMode' : 'lightMode')}>
			<Helmet>
				<title>{pageTitle}</title>
			</Helmet>

			{showTrialExpiryBanner && !showPaymentFailedWarning && (
				<div className="trial-expiry-banner">
					You are in free trial period. Your free trial will end on{' '}
					<span>{getFormattedDate(trialInfo?.trialEnd || Date.now())}.</span>
					{user.role === USER_ROLES.ADMIN ? (
						<span>
							{' '}
							Please{' '}
							<a className="upgrade-link" onClick={handleUpgrade}>
								upgrade
							</a>
							to continue using SigNoz features.
						</span>
					) : (
						'Please contact your administrator for upgrading to a paid plan.'
					)}
				</div>
			)}

			{showWorkspaceRestricted && renderWorkspaceRestrictedBanner()}

			{!showTrialExpiryBanner && showPaymentFailedWarning && (
				<div className="payment-failed-banner">
					Your bill payment has failed. Your workspace will get suspended on{' '}
					<span>
						{getFormattedDateWithMinutes(
							dayjs(activeLicenseV3?.event_queue?.scheduled_at).unix() || Date.now(),
						)}
						.
					</span>
					{user.role === USER_ROLES.ADMIN ? (
						<span>
							{' '}
							Please{' '}
							<a className="upgrade-link" onClick={handleFailedPayment}>
								pay the bill
							</a>
							to continue using SigNoz features.
						</span>
					) : (
						' Please contact your administrator to pay the bill.'
					)}
				</div>
			)}

			<Flex className={cx('app-layout', isDarkMode ? 'darkMode' : 'lightMode')}>
				{isToDisplayLayout && !renderFullScreen && <SideNav />}
				<div
					className={cx('app-content', {
						'full-screen-content': renderFullScreen,
					})}
					data-overlayscrollbars-initialize
				>
					<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
						<LayoutContent data-overlayscrollbars-initialize>
							<OverlayScrollbar>
								<ChildrenContainer
									style={{
										margin:
											isHome() ||
											isLogsView() ||
											isTracesView() ||
											isDashboardView() ||
											isDashboardWidgetView() ||
											isDashboardListView() ||
											isAlertHistory() ||
											isAlertOverview() ||
											isMessagingQueues() ||
											isCloudIntegrationPage() ||
											isInfraMonitoring()
												? 0
												: '0 1rem',

										...(isTraceDetailsView() ? { margin: 0 } : {}),
									}}
								>
									{isToDisplayLayout && !renderFullScreen && <TopNav />}
									{children}
								</ChildrenContainer>
							</OverlayScrollbar>
						</LayoutContent>
					</Sentry.ErrorBoundary>
				</div>
			</Flex>

			{showAddCreditCardModal && <ChatSupportGateway />}
		</Layout>
	);
}

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
