import { Col, Row, Space } from 'antd';
import ROUTES from 'constants/routes';
import { useMemo } from 'react';
import { matchPath, useHistory } from 'react-router-dom';

import NewExplorerCTA from '../NewExplorerCTA';
import ShowBreadcrumbs from './Breadcrumbs';
import DateTimeSelector from './DateTimeSelection';
import {
	routesToDisable,
	routesToHideBreadCrumbs,
	routesToSkip,
} from './DateTimeSelection/config';
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

	const isRouteToHideBreadCrumbs = useMemo(
		() =>
			routesToHideBreadCrumbs.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isDisabled = useMemo(
		() =>
			routesToDisable.some((route) =>
				matchPath(location.pathname, { path: route, exact: true }),
			),
		[location.pathname],
	);

	const isSignUpPage = useMemo(
		() => matchPath(location.pathname, { path: ROUTES.SIGN_UP, exact: true }),
		[location.pathname],
	);

	if (isSignUpPage || isDisabled) {
		return null;
	}

	return (
		<Container>
			{!isRouteToHideBreadCrumbs && (
				<Col span={16}>
					<ShowBreadcrumbs />
				</Col>
			)}

			{!isRouteToSkip && (
				<Col span={isRouteToHideBreadCrumbs ? 24 : 8}>
					<Row justify="end">
						<Space align="start" size={60} direction="horizontal">
							<NewExplorerCTA />
							<div>
								<DateTimeSelector />
							</div>
						</Space>
					</Row>
				</Col>
			)}
		</Container>
	);
}

export default TopNav;
