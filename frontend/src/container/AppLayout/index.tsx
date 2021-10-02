import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import React, { ReactNode } from 'react';

import { Content, Footer, Layout } from './styles';
const BaseLayout = ({ children }: BaseLayoutProps): JSX.Element => {
	const currentYear = new Date().getFullYear();

	return (
		<Layout>
			<SideNav />
			<Content>
				<TopNav />
				{children}
				<Footer>{`SigNoz Inc. © ${currentYear}`}</Footer>
			</Content>
		</Layout>
	);
};

interface BaseLayoutProps {
	children: ReactNode;
}

export default BaseLayout;
