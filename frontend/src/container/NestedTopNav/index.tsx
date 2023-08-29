import { Col, Row, Space } from 'antd';

import ShowBreadcrumbs from '../TopNav/Breadcrumbs';
import DateTimeSelector from '../TopNav/DateTimeSelection';
import { Container } from './styles';
import { NestedTopNavProps } from './types';

function NestedTopNav({
	actions,
	renderPermissions,
}: NestedTopNavProps): JSX.Element | null {
	return (
		<Container>
			<Col span={16}>
				<ShowBreadcrumbs />
			</Col>

			<Col span={8}>
				<Row justify="end">
					<Space align="start" size={30} direction="horizontal">
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

export default NestedTopNav;
