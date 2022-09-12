import { notification } from 'antd';
import getFeatureFlags from 'api/features/getFeatures';
import getUserLatestVersion from 'api/user/getLatestVersion';
import getUserVersion from 'api/user/getVersion';
import Header from 'container/Header';
import SideNav from 'container/SideNav';
import TopNav from 'container/TopNav';
import React, { ReactNode, useEffect, useRef } from 'react';
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
	UPDATE_FEATURE_FLAGS,
	UPDATE_LATEST_VERSION,
	UPDATE_LATEST_VERSION_ERROR,
} from 'types/actions/app';
import AppReducer from 'types/reducer/app';

import { ChildrenContainer, Layout } from './styles';

function AppLayout(props: AppLayoutProps): JSX.Element {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);
	const { pathname } = useLocation();
	const { t } = useTranslation();

	const [
		getUserVersionResponse,
		getUserLatestVersionResponse,
		getFeaturesResponse,
	] = useQueries([
		{
			queryFn: getUserVersion,
			queryKey: 'getUserVersion',
			enabled: isLoggedIn,
		},
		{
			queryFn: getUserLatestVersion,
			queryKey: 'getUserLatestVersion',
			enabled: isLoggedIn,
		},
		{
			queryFn: getFeatureFlags,
			queryKey: 'getFeatureFlags',
		},
	]);

	useEffect(() => {
		if (getUserLatestVersionResponse.status === 'idle' && isLoggedIn) {
			getUserLatestVersionResponse.refetch();
		}

		if (getUserVersionResponse.status === 'idle' && isLoggedIn) {
			getUserVersionResponse.refetch();
		}
		if (getFeaturesResponse.status === 'idle') {
			getFeaturesResponse.refetch();
		}
	}, [
		getFeaturesResponse,
		getUserLatestVersionResponse,
		getUserVersionResponse,
		isLoggedIn,
	]);

	const { children } = props;

	const dispatch = useDispatch<Dispatch<AppActions>>();

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
			notification.error({
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
			notification.error({
				message: t('oops_something_went_wrong_version'),
			});
		}
		if (
			getFeaturesResponse.isFetched &&
			getFeaturesResponse.isSuccess &&
			getFeaturesResponse.data &&
			getFeaturesResponse.data.payload
		) {
			dispatch({
				type: UPDATE_FEATURE_FLAGS,
				payload: {
					...getFeaturesResponse.data.payload,
				},
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
		getFeaturesResponse.isLoading,
		getFeaturesResponse.isError,
		getFeaturesResponse.data,
		getFeaturesResponse.isFetched,
		getFeaturesResponse.isSuccess,
	]);

	const isToDisplayLayout = isLoggedIn;

	return (
		<Layout>
			{isToDisplayLayout && <Header />}
			<Layout>
				{isToDisplayLayout && <SideNav />}
				<Layout.Content>
					<ChildrenContainer>
						{isToDisplayLayout && <TopNav />}
						{children}
					</ChildrenContainer>
				</Layout.Content>
			</Layout>
		</Layout>
	);
}

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
