import React, { ReactNode, useEffect } from 'react';

import { Layout } from 'antd';
import SideNav from './Nav/SideNav';
import TopNav from './Nav/TopNav';
import { useLocation } from 'react-router-dom';
import { useRoute } from './RouteProvider';

const { Content, Footer } = Layout;

interface BaseLayoutProps {
	children: ReactNode;
}

const BaseLayout: React.FC<BaseLayoutProps> = ({ children }) => {
	const location = useLocation();
	const { dispatch } = useRoute();

	useEffect(() => {
		dispatch({ type: 'ROUTE_IS_LOADED', payload: location.pathname });
	}, [location]);

	return (
		<Layout style={{ minHeight: '100vh' }}>
			<SideNav />
			<Layout className="site-layout">
				<Content style={{ margin: '0 16px' }}>
					<TopNav />
					{children}
				</Content>
				<Footer style={{ textAlign: 'center', fontSize: 10 }}>
					SigNoz Inc. ©2020{' '}
				</Footer>
			</Layout>
		</Layout>
	);
};

export default BaseLayout;
