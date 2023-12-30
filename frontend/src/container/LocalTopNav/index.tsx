import { Col, Row, Space } from 'antd';
import NewExplorerCTA from 'container/NewExplorerCTA';

import ShowBreadcrumbs from '../TopNav/Breadcrumbs';
import DateTimeSelector from '../TopNav/DateTimeSelection';
import { Container } from './styles';
import { LocalTopNavProps } from './types';

function LocalTopNav({
	actions,
	renderPermissions,
}: LocalTopNavProps): JSX.Element | null {
	return (
		<Container>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			<Col span={8}>
				<Row justify="end">
					<Space align="start" size={30} direction="horizontal">
						<NewExplorerCTA />
						{actions}
						{renderPermissions?.isDateTimeEnabled && (
							<div>
								<DateTimeSelector />
							</div>
						)}
					</Space>
				</Row>
			</Col>
		</Container>
	);
}

export default LocalTopNav;
