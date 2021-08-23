import { Col,Row } from 'antd';
import ROUTES from 'constants/routes';
import React from 'react';
import { useHistory } from 'react-router-dom';

import DateTimeSelector from './DateTimeSelector';
import ShowBreadcrumbs from './ShowBreadcrumbs';

const TopNav = () => {
	const history = useHistory();

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
