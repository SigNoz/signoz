import ROUTES from 'constants/routes';
import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import history from 'lib/history';
import React, { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { Content, Footer, Layout } from './styles';

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);

	const [isSignUpPage, setIsSignUpPage] = useState(
		ROUTES.SIGN_UP === location.pathname,
	);

	useEffect(() => {
		if (!isLoggedIn) {
			setIsSignUpPage(true);
			history.push(ROUTES.SIGN_UP);
		} else {
			if (isSignUpPage) {
				setIsSignUpPage(false);
			}
		}
	}, [isLoggedIn, isSignUpPage]);

	const currentYear = new Date().getFullYear();

	return (
		<Layout>
			{!isSignUpPage && <SideNav />}
			<Layout>
				<Content>
					{!isSignUpPage && <TopNav />}
					{children}
				</Content>
				<Footer>{`SigNoz Inc. © ${currentYear}`}</Footer>
			</Layout>
		</Layout>
	);
};

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
