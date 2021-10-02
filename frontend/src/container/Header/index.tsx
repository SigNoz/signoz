import { Col } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';

import ShowBreadcrumbs from './Breadcrumbs';
import DateTimeSelector from './DateTimeSelection';
import { Container } from './styles';

const TopNav = (): JSX.Element | null => {
	if (history.location.pathname === ROUTES.SIGN_UP) {
		return null;
	}

	return (
		<Container>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			<Col span={8}>
				<DateTimeSelector />
			</Col>
		</Container>
	);
};

export default TopNav;
