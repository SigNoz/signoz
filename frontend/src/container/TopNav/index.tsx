import { Col } from 'antd';
import ROUTES from 'constants/routes';
import React, { useMemo } from 'react';
import { matchPath, useHistory } from 'react-router-dom';

import AutoRefresh from './AutoRefresh';
import ShowBreadcrumbs from './Breadcrumbs';
import DateTimeSelector from './DateTimeSelection';
import { routesToSkip } from './DateTimeSelection/config';
import { Container } from './styles';

function TopNav(): JSX.Element | null {
	const { location } = useHistory();

	const isRouteToSkip = useMemo(
		() =>
			routesToSkip.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isSignUpPage = useMemo(
		() => matchPath(location.pathname, { path: ROUTES.SIGN_UP, exact: true }),
		[location.pathname],
	);

	const isDashboardPage = useMemo(
		() => matchPath(location.pathname, { path: ROUTES.DASHBOARD, exact: true }),
		[location.pathname],
	);

	if (isSignUpPage) {
		return null;
	}

	return (
		<Container>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			{isDashboardPage && (
				<Col span={3}>
					<AutoRefresh />
				</Col>
			)}

			{!isRouteToSkip && (
				<Col span={isDashboardPage ? 5 : 8}>
					<DateTimeSelector />
				</Col>
			)}
		</Container>
	);
}

export default TopNav;
