import './TopNav.styles.scss';

import { Col, Row, Space } from 'antd';
import ROUTES from 'constants/routes';
import { useMemo } from 'react';
import { matchPath, useLocation } from 'react-router-dom-v5-compat';

import NewExplorerCTA from '../NewExplorerCTA';
import DateTimeSelector from './DateTimeSelectionV2';
import { routesToDisable, routesToSkip } from './DateTimeSelectionV2/config';

function TopNav(): JSX.Element | null {
	const location = useLocation();

	const isRouteToSkip = useMemo(
		() => routesToSkip.some((route) => matchPath(location.pathname, route)),
		[location.pathname],
	);

	const isDisabled = useMemo(
		() => routesToDisable.some((route) => matchPath(location.pathname, route)),
		[location.pathname],
	);

	const isSignUpPage = useMemo(
		() => matchPath(location.pathname, ROUTES.SIGN_UP),
		[location.pathname],
	);

	const isNewAlertsLandingPage = useMemo(
		() => matchPath(location.pathname, ROUTES.ALERTS_NEW) && !location.search,
		[location.pathname, location.search],
	);

	if (isSignUpPage || isDisabled || isRouteToSkip || isNewAlertsLandingPage) {
		return null;
	}

	return !isRouteToSkip ? (
		<div className="top-nav-container">
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
		</div>
	) : null;
}

export default TopNav;
