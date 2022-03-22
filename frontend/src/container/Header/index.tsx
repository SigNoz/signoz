import { Col } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';
import { matchPath, useLocation } from 'react-router-dom';

import ShowBreadcrumbs from './Breadcrumbs';
import DateTimeSelector from './DateTimeSelection';
import { Container } from './styles';

const routesToSkip = [
	ROUTES.SETTINGS,
	ROUTES.LIST_ALL_ALERT,
	ROUTES.TRACE_DETAIL,
	ROUTES.ALL_CHANNELS,
];

function TopNav(): JSX.Element | null {
	const { pathname } = useLocation();

	if (history.location.pathname === ROUTES.SIGN_UP) {
		return null;
	}

	const checkRouteExists = (currentPath: string) => {
		for (let i = 0; i < routesToSkip.length; ++i) {
			if (
				matchPath(currentPath, { path: routesToSkip[i], exact: true, strict: true })
			) {
				return true;
			}
		}
		return false;
	};

	return (
		<Container>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			{!checkRouteExists(pathname) && (
				<Col span={8}>
					<DateTimeSelector />
				</Col>
			)}
		</Container>
	);
}

export default TopNav;
