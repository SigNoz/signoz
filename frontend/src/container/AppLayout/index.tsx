/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import './AppLayout.styles.scss';

import * as Sentry from '@sentry/react';
import { Flex } from 'antd';
import getUserLatestVersion from 'api/user/getLatestVersion';
import getUserVersion from 'api/user/getVersion';
import cx from 'classnames';
import ChatSupportGateway from 'components/ChatSupportGateway/ChatSupportGateway';
import OverlayScrollbar from 'components/OverlayScrollbar/OverlayScrollbar';
import { FeatureKeys } from 'constants/features';
import ROUTES from 'constants/routes';
import SideNav from 'container/SideNav';
import TopNav from 'container/TopNav';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useFeatureFlags from 'hooks/useFeatureFlag';
import useLicense from 'hooks/useLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_CURRENT_ERROR,
	UPDATE_CURRENT_VERSION,
	UPDATE_LATEST_VERSION,
	UPDATE_LATEST_VERSION_ERROR,
} from 'types/actions/app';
import AppReducer from 'types/reducer/app';
import { isCloudUser } from 'utils/app';
import { getFormattedDate, getRemainingDays } from 'utils/timeUtils';

import { ChildrenContainer, Layout, LayoutContent } from './styles';
import { getRouteKey } from './utils';

// eslint-disable-next-line sonarjs/cognitive-complexity
function AppLayout(props: AppLayoutProps): JSX.Element {
	const { isLoggedIn, user, role } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const { notifications } = useNotifications();

	const isDarkMode = useIsDarkMode();

	const { data: licenseData, isFetching } = useLicense();

	const isPremiumChatSupportEnabled =
		useFeatureFlags(FeatureKeys.PREMIUM_SUPPORT)?.active || false;

	const isChatSupportEnabled =
		useFeatureFlags(FeatureKeys.CHAT_SUPPORT)?.active || false;

	const isCloudUserVal = isCloudUser();

	const showAddCreditCardModal =
		isLoggedIn &&
		isChatSupportEnabled &&
		isCloudUserVal &&
		!isPremiumChatSupportEnabled &&
		!licenseData?.payload?.trialConvertedToSubscription;

	const { pathname } = useLocation();
	const { t } = useTranslation(['titles']);

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
		pathname === ROUTES.GET_STARTED_APPLICATION_MONITORING ||
		pathname === ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING ||
		pathname === ROUTES.GET_STARTED_LOGS_MANAGEMENT ||
		pathname === ROUTES.GET_STARTED_AWS_MONITORING ||
		pathname === ROUTES.GET_STARTED_AZURE_MONITORING;

	const [showTrialExpiryBanner, setShowTrialExpiryBanner] = useState(false);

	useEffect(() => {
		if (
			!isFetching &&
			licenseData?.payload?.onTrial &&
			!licenseData?.payload?.trialConvertedToSubscription &&
			!licenseData?.payload?.workSpaceBlock &&
			getRemainingDays(licenseData?.payload.trialEnd) < 7
		) {
			setShowTrialExpiryBanner(true);
		}
	}, [licenseData, isFetching]);

	const handleUpgrade = (): void => {
		if (role === 'ADMIN') {
			history.push(ROUTES.BILLING);
		}
	};

	const isLogsView = (): boolean =>
		routeKey === 'LOGS' ||
		routeKey === 'LOGS_EXPLORER' ||
		routeKey === 'LOGS_PIPELINES' ||
		routeKey === 'LOGS_SAVE_VIEWS';

	const isTracesView = (): boolean =>
		routeKey === 'TRACES_EXPLORER' || routeKey === 'TRACES_SAVE_VIEWS';

	const isMessagingQueues = (): boolean =>
		routeKey === 'MESSAGING_QUEUES' || routeKey === 'MESSAGING_QUEUES_DETAIL';

	const isDashboardListView = (): boolean => routeKey === 'ALL_DASHBOARD';
	const isAlertHistory = (): boolean => routeKey === 'ALERT_HISTORY';
	const isAlertOverview = (): boolean => routeKey === 'ALERT_OVERVIEW';
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

	return (
		<Layout className={cx(isDarkMode ? 'darkMode' : 'lightMode')}>
			<Helmet>
				<title>{pageTitle}</title>
			</Helmet>

			{showTrialExpiryBanner && (
				<div className="trial-expiry-banner">
					You are in free trial period. Your free trial will end on{' '}
					<span>
						{getFormattedDate(licenseData?.payload?.trialEnd || Date.now())}.
					</span>
					{role === 'ADMIN' ? (
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

			<Flex className={cx('app-layout', isDarkMode ? 'darkMode' : 'lightMode')}>
				{isToDisplayLayout && !renderFullScreen && (
					<SideNav licenseData={licenseData} isFetching={isFetching} />
				)}
				<div className="app-content" data-overlayscrollbars-initialize>
					<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
						<LayoutContent data-overlayscrollbars-initialize>
							<OverlayScrollbar>
								<ChildrenContainer
									style={{
										margin:
											isLogsView() ||
											isTracesView() ||
											isDashboardView() ||
											isDashboardWidgetView() ||
											isDashboardListView() ||
											isAlertHistory() ||
											isAlertOverview() ||
											isMessagingQueues()
												? 0
												: '0 1rem',

										...(isTraceDetailsView() ? { marginRight: 0 } : {}),
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
