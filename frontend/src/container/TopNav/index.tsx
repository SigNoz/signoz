import { Col } from 'antd';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import React from 'react';
import { matchPath } from 'react-router-dom';

import ShowBreadcrumbs from './Breadcrumbs';
import DateTimeSelector from './DateTimeSelection';
import { Container } from './styles';

const skipDateTimeSelectorRoutes = [
	ROUTES.SETTINGS,
	ROUTES.LIST_ALL_ALERT,
	ROUTES.TRACE_DETAIL,
	ROUTES.ALL_CHANNELS,
	ROUTES.USAGE_EXPLORER,
	ROUTES.INSTRUMENTATION,
	ROUTES.VERSION,
	ROUTES.ALL_DASHBOARD,
	ROUTES.ORG_SETTINGS,
	ROUTES.ERROR_DETAIL,
	ROUTES.ALERTS_NEW,
	ROUTES.EDIT_ALERTS,
	ROUTES.LIST_ALL_ALERT,
];

const checkRouteExists = (currentPath: string): boolean =>
	Boolean(
		matchPath(currentPath, {
			path: skipDateTimeSelectorRoutes,
			exact: true,
			strict: true,
		}),
	);

function TopNav(): JSX.Element | null {
	if (history.location.pathname === ROUTES.SIGN_UP) {
		return null;
	}

	return (
		<Container>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			{!checkRouteExists(history.location.pathname) && (
				<Col span={8}>
					<DateTimeSelector />
				</Col>
			)}
		</Container>
	);
}

export default TopNav;
