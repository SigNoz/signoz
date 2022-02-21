import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import React, { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';
import Feedback from './FeedBack';
import { Content, Layout } from './styles';

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
	const { isLoggedIn } = useSelector<AppState, AppReducer>((state) => state.app);

	return (
		<Layout>
			{isLoggedIn && <SideNav />}
			<Layout>
				<Content>
					{isLoggedIn && <TopNav />}
					{children}
				</Content>
			</Layout>

			<Feedback />
		</Layout>
	);
};

interface AppLayoutProps {
	children: ReactNode;
}

export default AppLayout;
