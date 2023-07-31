import { Col, Row, Space } from 'antd';
import ROUTES from 'constants/routes';
import { useMemo } from 'react';
import { matchPath, useHistory } from 'react-router-dom';

import ShowBreadcrumbs from './Breadcrumbs';
import DateTimeSelector from './DateTimeSelection';
import { routesToSkip } from './DateTimeSelection/config';
import NewExplorerCTA from './NewExplorerCTA';
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

	if (isSignUpPage) {
		return null;
	}

	return (
		<Container>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			{!isRouteToSkip && (
				<Col span={8}>
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
