import { Layout } from 'antd';
import ROUTES from 'constants/routes';
import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import history from 'lib/history';
import React, { ReactNode, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

const { Content, Footer } = Layout;

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
		<Layout style={{ minHeight: '100vh' }}>
			{!isSignUpPage && <SideNav />}
			<Layout className="site-layout">
				<Content style={{ margin: '0 16px' }}>
					{!isSignUpPage && <TopNav />}
					{children}
				</Content>
				<Footer style={{ textAlign: 'center', fontSize: 10 }}>
					SigNoz Inc. ©{currentYear}
				</Footer>
			</Layout>
		</Layout>
	);
};

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
