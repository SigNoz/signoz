/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/anchor-is-valid */
import './AppLayout.styles.scss';

import { Flex } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import getDynamicConfigs from 'api/dynamicConfigs/getDynamicConfigs';
import getUserLatestVersion from 'api/user/getLatestVersion';
import getUserVersion from 'api/user/getVersion';
import cx from 'classnames';
import { IS_SIDEBAR_COLLAPSED } from 'constants/app';
import ROUTES from 'constants/routes';
import SideNav from 'container/SideNav';
import TopNav from 'container/TopNav';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useLicense from 'hooks/useLicense';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import {
	ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import { sideBarCollapse } from 'store/actions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_CONFIGS,
	UPDATE_CURRENT_ERROR,
	UPDATE_CURRENT_VERSION,
	UPDATE_LATEST_VERSION,
	UPDATE_LATEST_VERSION_ERROR,
} from 'types/actions/app';
import AppReducer from 'types/reducer/app';
import { getFormattedDate, getRemainingDays } from 'utils/timeUtils';

import { ChildrenContainer, Layout, LayoutContent } from './styles';
import { getRouteKey } from './utils';

function AppLayout(props: AppLayoutProps): JSX.Element {
	const { isLoggedIn, user, role } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const [collapsed, setCollapsed] = useState<boolean>(
		getLocalStorageKey(IS_SIDEBAR_COLLAPSED) === 'true',
	);

	const isDarkMode = useIsDarkMode();

	const { data: licenseData, isFetching } = useLicense();

	const { pathname } = useLocation();
	const { t } = useTranslation(['titles']);

	const [
		getUserVersionResponse,
		getUserLatestVersionResponse,
		getDynamicConfigsResponse,
	] = useQueries([
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
		{
			queryFn: getDynamicConfigs,
			queryKey: ['getDynamicConfigs', user?.accessJwt],
		},
	]);

	useEffect(() => {
		if (getUserLatestVersionResponse.status === 'idle' && isLoggedIn) {
			getUserLatestVersionResponse.refetch();
		}

		if (getUserVersionResponse.status === 'idle' && isLoggedIn) {
			getUserVersionResponse.refetch();
		}
		if (getDynamicConfigsResponse.status === 'idle') {
			getDynamicConfigsResponse.refetch();
		}
	}, [
		getUserLatestVersionResponse,
		getUserVersionResponse,
		isLoggedIn,
		getDynamicConfigsResponse,
	]);

	const { children } = props;

	const dispatch = useDispatch<Dispatch<AppActions | any>>();

	const latestCurrentCounter = useRef(0);
	const latestVersionCounter = useRef(0);
	const latestConfigCounter = useRef(0);

	const { notifications } = useNotifications();

	const onCollapse = useCallback(() => {
		setCollapsed((collapsed) => !collapsed);
	}, []);

	useLayoutEffect(() => {
		dispatch(sideBarCollapse(collapsed));
	}, [collapsed, dispatch]);

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

		if (
			getDynamicConfigsResponse.isFetched &&
			getDynamicConfigsResponse.isSuccess &&
			getDynamicConfigsResponse.data &&
			getDynamicConfigsResponse.data.payload &&
			latestConfigCounter.current === 0
		) {
			latestConfigCounter.current = 1;

			dispatch({
				type: UPDATE_CONFIGS,
				payload: {
					configs: getDynamicConfigsResponse.data.payload,
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
		getDynamicConfigsResponse.data,
		getDynamicConfigsResponse.isFetched,
		getDynamicConfigsResponse.isSuccess,
		notifications,
	]);

	const isToDisplayLayout = isLoggedIn;

	const routeKey = useMemo(() => getRouteKey(pathname), [pathname]);
	const pageTitle = t(routeKey);
	const renderFullScreen =
		pathname === ROUTES.GET_STARTED ||
		pathname === ROUTES.WORKSPACE_LOCKED ||
		pathname === ROUTES.GET_STARTED_APPLICATION_MONITORING ||
		pathname === ROUTES.GET_STARTED_INFRASTRUCTURE_MONITORING ||
		pathname === ROUTES.GET_STARTED_LOGS_MANAGEMENT ||
		pathname === ROUTES.GET_STARTED_AWS_MONITORING;

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

	const isDashboardView = (): boolean => {
		/**
		 * need to match using regex here as the getRoute function will not work for
		 * routes with id
		 */
		const regex = /^\/dashboard\/[a-zA-Z0-9_-]+$/;
		return regex.test(pathname);
	};

	const isDashboardWidgetView = (): boolean => {
		const regex = /^\/dashboard\/[a-zA-Z0-9_-]+\/new$/;
		return regex.test(pathname);
	};

	useEffect(() => {
		if (isDarkMode) {
			document.body.classList.remove('lightMode');
			document.body.classList.add('darkMode');
		} else {
			document.body.classList.add('lightMode');
			document.body.classList.remove('darkMode');
		}
	}, [isDarkMode]);

	const isSideNavCollapsed = getLocalStorageKey(IS_SIDEBAR_COLLAPSED);

	return (
		<Layout
			className={cx(
				isDarkMode ? 'darkMode' : 'lightMode',
				isSideNavCollapsed ? 'sidebarCollapsed' : '',
			)}
		>
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

			<Flex
				className={cx(
					'app-layout',
					isDarkMode ? 'darkMode' : 'lightMode',
					!collapsed && !renderFullScreen ? 'docked' : '',
				)}
			>
				{isToDisplayLayout && !renderFullScreen && (
					<SideNav
						licenseData={licenseData}
						isFetching={isFetching}
						onCollapse={onCollapse}
						collapsed={collapsed}
					/>
				)}
				<div className={cx('app-content', collapsed ? 'collapsed' : '')}>
					<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
						<LayoutContent>
							<ChildrenContainer
								style={{
									margin:
										isLogsView() ||
										isTracesView() ||
										isDashboardView() ||
										isDashboardWidgetView()
											? 0
											: ' 0 1rem',
								}}
							>
								{isToDisplayLayout && !renderFullScreen && <TopNav />}
								{children}
							</ChildrenContainer>
						</LayoutContent>
					</ErrorBoundary>
				</div>
			</Flex>
		</Layout>
	);
}

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
