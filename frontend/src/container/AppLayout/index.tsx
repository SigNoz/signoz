import ROUTES from 'constants/routes';
import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import history from 'lib/history';
import React, { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { Content, Layout } from './styles';

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);

	const [isSignUpPage, setIsSignUpPage] = useState(
		ROUTES.SIGN_UP === location.pathname,
	);

	useEffect(() => {
		if (!isLoggedIn) {
			setIsSignUpPage(true);
			history.push(ROUTES.SIGN_UP);
		} else if (isSignUpPage) {
			setIsSignUpPage(false);
		}
	}, [isLoggedIn, isSignUpPage]);

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
};

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
