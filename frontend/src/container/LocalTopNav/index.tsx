import { Col, Row, Space } from 'antd';
import NewExplorerCTA from 'container/NewExplorerCTA';

import DateTimeSelector from '../TopNav/DateTimeSelection';
import { Container } from './styles';
import { LocalTopNavProps } from './types';

function LocalTopNav({
	actions,
	renderPermissions,
}: LocalTopNavProps): JSX.Element | null {
	return (
		<Container>
			<Col span={24}>
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
