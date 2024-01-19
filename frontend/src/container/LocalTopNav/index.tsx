import { Col, Row, Space, Typography } from 'antd';
import ROUTES from 'constants/routes';
import NewExplorerCTA from 'container/NewExplorerCTA';
import { FileText } from 'lucide-react';
import { useLocation } from 'react-use';

import DateTimeSelector from '../TopNav/DateTimeSelection';
import { Container } from './styles';
import { LocalTopNavProps } from './types';

function LocalTopNav({
	actions,
	renderPermissions,
}: LocalTopNavProps): JSX.Element | null {
	const { pathname } = useLocation();

	const isLiveLogsPage = pathname === ROUTES.LIVE_LOGS;

	return (
		<Container>
			{isLiveLogsPage && (
				<Col span={16}>
					<Space>
						<FileText color="#fff" size={16} />

						<Typography.Title level={4} style={{ marginTop: 0, marginBottom: 0 }}>
							Live Logs
						</Typography.Title>
					</Space>
				</Col>
			)}

			<Col span={isLiveLogsPage ? 8 : 24}>
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
