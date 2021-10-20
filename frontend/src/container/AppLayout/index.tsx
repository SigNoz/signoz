import { Layout } from 'antd';
import get from 'api/browser/localstorage/get';
import ROUTES from 'constants/routes';
import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import history from 'lib/history';
import React, { ReactNode, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

const { Content, Footer } = Layout;
interface BaseLayoutProps {
	children: ReactNode;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);
	const isLoggedInLocalStorage = get('isLoggedIn');

	useEffect(() => {
		if (isLoggedIn && history.location.pathname === '/') {
			history.push(ROUTES.APPLICATION);
		}

		if (!isLoggedIn && isLoggedInLocalStorage !== null) {
			history.push(ROUTES.APPLICATION);
		} else {
			if (isLoggedInLocalStorage === null) {
				history.push(ROUTES.SIGN_UP);
			}
		}
	}, [isLoggedIn, isLoggedInLocalStorage]);

	const currentYear = new Date().getFullYear();

	return (
		<Layout style={{ minHeight: '100vh' }}>
			<SideNav />
			<Layout className="site-layout">
				<Content style={{ margin: '0 16px' }}>
					<TopNav />
					{children}
				</Content>
				<Footer style={{ textAlign: 'center', fontSize: 10 }}>
					SigNoz Inc. ©{currentYear}
				</Footer>
			</Layout>
		</Layout>
	);
};

export default BaseLayout;
