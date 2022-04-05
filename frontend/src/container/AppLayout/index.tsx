import { notification } from 'antd';
import getLatestVersion from 'api/user/getLatestVersion';
import getVersion from 'api/user/getVersion';
import ROUTES from 'constants/routes';
import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import useFetch from 'hooks/useFetch';
import history from 'lib/history';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import { Content, Layout } from './styles';

function AppLayout(props: AppLayoutProps): JSX.Element {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);
	const { pathname } = useLocation();
	const { t } = useTranslation();

	const [isSignUpPage, setIsSignUpPage] = useState(ROUTES.SIGN_UP === pathname);

	const { payload: versionPayload, loading, error: getVersionError } = useFetch(
		getVersion,
	);

	const {
		payload: latestVersionPayload,
		loading: latestLoading,
		error: latestError,
	} = useFetch(getLatestVersion);

	const { children } = props;

	const dispatch = useDispatch<Dispatch<AppActions>>();

	useEffect(() => {
		if (!isLoggedIn) {
			setIsSignUpPage(true);
			history.push(ROUTES.SIGN_UP);
		} else if (isSignUpPage) {
			setIsSignUpPage(false);
		}
	}, [isLoggedIn, isSignUpPage]);

	const latestCurrentCounter = useRef(0);
	const latestVersionCounter = useRef(0);

	useEffect(() => {
		if (isLoggedIn && pathname === ROUTES.SIGN_UP) {
			history.push(ROUTES.APPLICATION);
		}

		if (!latestLoading && latestError && latestCurrentCounter.current === 0) {
			latestCurrentCounter.current = 1;

			dispatch({
				type: UPDATE_LATEST_VERSION_ERROR,
				payload: {
					isError: true,
				},
			});
			notification.error({
				message: t('oops_something_went_wrong_version'),
			});
		}

		if (!loading && getVersionError && latestVersionCounter.current === 0) {
			latestVersionCounter.current = 1;

			dispatch({
				type: UPDATE_CURRENT_ERROR,
				payload: {
					isError: true,
				},
			});
			notification.error({
				message: t('oops_something_went_wrong_version'),
			});
		}

		if (!latestLoading && versionPayload) {
			dispatch({
				type: UPDATE_CURRENT_VERSION,
				payload: {
					currentVersion: versionPayload.version,
				},
			});
		}

		if (!loading && latestVersionPayload) {
			dispatch({
				type: UPDATE_LATEST_VERSION,
				payload: {
					latestVersion: latestVersionPayload.name,
				},
			});
		}
	}, [
		dispatch,
		loading,
		latestLoading,
		versionPayload,
		latestVersionPayload,
		isLoggedIn,
		pathname,
		getVersionError,
		latestError,
		t,
	]);

	return (
		<Layout>
			{!isSignUpPage && <SideNav />}
			<Layout>
				<Content>
					{!isSignUpPage && <TopNav />}
					{children}
				</Content>
			</Layout>
		</Layout>
	);
}

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
