import { Col, Row, Space } from 'antd';
import ROUTES from 'constants/routes';
import { useMemo } from 'react';
import { matchPath, useHistory } from 'react-router-dom';

import NewExplorerCTA from '../NewExplorerCTA';
import DateTimeSelector from './DateTimeSelectionV2';
import {
	routesToDisableDateTimePicker,
	routesToShowTopNav,
} from './DateTimeSelectionV2/config';

function TopNav(): JSX.Element | null {
	const { location } = useHistory();

	// Allowlist approach: only show TopNav on explicitly approved routes
	const shouldShowTopNav = useMemo(
		() =>
			routesToShowTopNav.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isDateTimePickerDisabled = useMemo(
		() =>
			routesToDisableDateTimePicker.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isSignUpPage = useMemo(
		() => matchPath(location.pathname, { path: ROUTES.SIGN_UP, exact: true }),
		[location.pathname],
	);

	const isNewAlertsLandingPage = useMemo(
		() =>
			matchPath(location.pathname, { path: ROUTES.ALERTS_NEW, exact: true }) &&
			!location.search,
		[location.pathname, location.search],
	);

	if (isSignUpPage || isNewAlertsLandingPage || !shouldShowTopNav) {
		return null;
	}

	return (
		<Row style={{ marginBottom: '1rem' }}>
			<Col span={24} style={{ marginTop: '1rem' }}>
				<Row justify="end">
					<Space align="center" size={16} direction="horizontal">
						<NewExplorerCTA />
						<div>
							<DateTimeSelector
								showAutoRefresh
								disabled={isDateTimePickerDisabled}
							/>
						</div>
					</Space>
				</Row>
			</Col>
		</Row>
	);
}

export default TopNav;
