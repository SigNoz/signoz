import TopNav from 'container/Header';
import SideNav from 'container/SideNav';
import React, { ReactNode } from 'react';

import { Main } from './styles';
import { Content, Footer, Layout } from './styles';

const BaseLayout = ({ children }: BaseLayoutProps): JSX.Element => {
	const currentYear = new Date().getFullYear();

	return (
		<Layout>
			<SideNav />
			<Content>
				<TopNav />
				<Main>{children}</Main>
				<Footer>{`SigNoz Inc. © ${currentYear}`}</Footer>
			</Content>
		</Layout>
	);
};

interface BaseLayoutProps {
	children: ReactNode;
}

export default BaseLayout;
