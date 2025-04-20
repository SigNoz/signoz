import { Col, Row, Space } from 'antd';
import ROUTES from 'constants/routes';
import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { matchPath } from 'react-router-dom-v5-compat';

import NewExplorerCTA from '../NewExplorerCTA';
import DateTimeSelector from './DateTimeSelectionV2';
import { routesToDisable, routesToSkip } from './DateTimeSelectionV2/config';

function TopNav(): JSX.Element | null {
	const { location } = useHistory();

	const isRouteToSkip = useMemo(
		() =>
			routesToSkip.some((route) =>
				matchPath({ path: route, end: true }, location.pathname),
			),
		[location.pathname],
	);

	const isDisabled = useMemo(
		() =>
			routesToDisable.some((route) =>
				matchPath({ path: route, end: true }, location.pathname),
			),
		[location.pathname],
	);

	const isSignUpPage = useMemo(
		() => matchPath({ path: ROUTES.SIGN_UP, end: true }, location.pathname),
		[location.pathname],
	);

	const isNewAlertsLandingPage = useMemo(
		() =>
			matchPath({ path: ROUTES.ALERTS_NEW, end: true }, location.pathname) &&
			!location.search,
		[location.pathname, location.search],
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
