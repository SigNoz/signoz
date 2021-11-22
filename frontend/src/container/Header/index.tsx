import { Col } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';
import { useLocation } from 'react-router-dom';

import ShowBreadcrumbs from './Breadcrumbs';
import DateTimeSelector from './DateTimeSelection';
import { Container } from './styles';

const routesToSkip = [ROUTES.SETTINGS];

const TopNav = (): JSX.Element | null => {
	const { pathname } = useLocation();

	if (history.location.pathname === ROUTES.SIGN_UP) {
		return null;
	}

	return (
		<Container>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			{!routesToSkip.includes(pathname) && (
				<Col span={8}>
					<DateTimeSelector />
				</Col>
			)}
		</Container>
	);
};

export default TopNav;
