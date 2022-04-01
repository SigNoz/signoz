import getLatestVersion from 'api/user/getLatestVersion';
import getVersion from 'api/user/getVersion';
import ROUTES from 'constants/routes';
import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import useFetch from 'hooks/useFetch';
import history from 'lib/history';
import React, { ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import {
	UPDATE_CURRENT_VERSION,
	UPDATE_LATEST_VERSION,
} from 'types/actions/app';
import AppReducer from 'types/reducer/app';

import { Content, Layout } from './styles';

function AppLayout(props: AppLayoutProps): JSX.Element {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);
	const { pathname } = useLocation();

	const [isSignUpPage, setIsSignUpPage] = useState(ROUTES.SIGN_UP === pathname);

	const { payload: versionPayload, loading } = useFetch(getVersion);

	const { payload: latestVersionPayload, loading: latestLoading } = useFetch(
		getLatestVersion,
	);

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

	useEffect(() => {
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
	}, [dispatch, loading, latestLoading, versionPayload, latestVersionPayload]);

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
