import { Col, Row } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';

import DateTimeSelector from './DateTimeSelector';
import ShowBreadcrumbs from './ShowBreadcrumbs';

const TopNav = (): JSX.Element | null => {
	if (history.location.pathname === ROUTES.SIGN_UP) {
		return null;
	}
	return (
		<Row>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			<Col span={8}>
				<DateTimeSelector />
			</Col>
		</Row>
	);
};

export default TopNav;
