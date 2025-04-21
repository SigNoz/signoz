import { Col, Row, Space } from 'antd';
import ROUTES from 'constants/routes';
import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router';

import NewExplorerCTA from '../NewExplorerCTA';
import DateTimeSelector from './DateTimeSelectionV2';
import { routesToDisable, routesToSkip } from './DateTimeSelectionV2/config';

function TopNav(): JSX.Element | null {
	const { pathname, search } = useLocation();

	const isRouteToSkip = useMemo(
		() =>
			routesToSkip.some((route) =>
				matchPath({ path: route, end: true }, pathname),
			),
		[pathname],
	);

	const isDisabled = useMemo(
		() =>
			routesToDisable.some((route) =>
				matchPath({ path: route, end: true }, pathname),
			),
		[pathname],
	);

	const isSignUpPage = useMemo(
		() => matchPath({ path: ROUTES.SIGN_UP, end: true }, pathname),
		[pathname],
	);

	const isNewAlertsLandingPage = useMemo(
		() => matchPath({ path: ROUTES.ALERTS_NEW, end: true }, pathname) && !search,
		[pathname, search],
	);

	if (isSignUpPage || isDisabled || isRouteToSkip || isNewAlertsLandingPage) {
		return null;
	}

	return !isRouteToSkip ? (
		<Row style={{ marginBottom: '1rem' }}>
			<Col span={24} style={{ marginTop: '1rem' }}>
				<Row justify="end">
					<Space align="center" size={16} direction="horizontal">
						<NewExplorerCTA />
						<div>
							<DateTimeSelector showAutoRefresh />
						</div>
					</Space>
				</Row>
			</Col>
		</Row>
	) : null;
}

export default TopNav;
