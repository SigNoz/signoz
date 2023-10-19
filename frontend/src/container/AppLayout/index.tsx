import getDynamicConfigs from 'api/dynamicConfigs/getDynamicConfigs';
import getUserLatestVersion from 'api/user/getLatestVersion';
import getUserVersion from 'api/user/getVersion';
import ROUTES from 'constants/routes';
import Header from 'container/Header';
import SideNav from 'container/SideNav';
import TopNav from 'container/TopNav';
import { useNotifications } from 'hooks/useNotifications';
import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
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

import { ChildrenContainer, Layout, LayoutContent } from './styles';
import { getRouteKey } from './utils';

function AppLayout(props: AppLayoutProps): JSX.Element {
	const { isLoggedIn, user } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

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

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const latestCurrentCounter = useRef(0);
	const latestVersionCounter = useRef(0);
	const latestConfigCounter = useRef(0);

	const { notifications } = useNotifications();

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
		pathname === ROUTES.GET_STARTED || pathname === ROUTES.WORKSPACE_LOCKED;

	return (
		<Layout>
			<Helmet>
				<title>{pageTitle}</title>
			</Helmet>

			{isToDisplayLayout && <Header />}
			<Layout>
				{isToDisplayLayout && !renderFullScreen && <SideNav />}
				<LayoutContent>
					<ChildrenContainer>
						{isToDisplayLayout && !renderFullScreen && <TopNav />}
						{children}
					</ChildrenContainer>
				</LayoutContent>
			</Layout>
		</Layout>
	);
}

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
