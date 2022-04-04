import ROUTES from 'constants/routes';
import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import history from 'lib/history';
import React, { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { Content, Layout } from './styles';

function AppLayout(props: AppLayoutProps): JSX.Element {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);
	const { pathname } = useLocation();

	const [isSignUpPage, setIsSignUpPage] = useState(ROUTES.SIGN_UP === pathname);

	const { children } = props;

	useEffect(() => {
		if (!isLoggedIn) {
			setIsSignUpPage(true);
			history.push(ROUTES.SIGN_UP);
		} else if (isSignUpPage) {
			setIsSignUpPage(false);
		}
	}, [isLoggedIn, isSignUpPage]);

	useEffect(() => {
		if (isLoggedIn) {
			history.push(ROUTES.APPLICATION);
		}
	}, [isLoggedIn]);

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
