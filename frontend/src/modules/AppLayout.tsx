import { Layout } from 'antd';
import SideNav from 'components/SideNav';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React, { ReactNode, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import TopNav from './Nav/TopNav';
import { useRoute } from './RouteProvider';

const { Content, Footer } = Layout;

interface BaseLayoutProps {
	children: ReactNode;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
	const location = useLocation();
	const { dispatch } = useRoute();
	const currentYear = new Date().getFullYear();
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);

	useEffect(() => {
		dispatch({ type: 'ROUTE_IS_LOADED', payload: location.pathname });
	}, [location, dispatch]);

	useEffect(() => {
		if (isLoggedIn) {
			history.push(ROUTES.APPLICATION);
		} else {
			history.push(ROUTES.SIGN_UP);
		}
	}, [isLoggedIn]);

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
