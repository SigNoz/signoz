import { Col, Row } from 'antd';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import LogExplorerQuerySection from 'container/LogExplorerQuerySection';
import LogsExplorerViews from 'container/LogsExplorerViews';
import LogsTopNav from 'container/LogsTopNav';
import { DataSource } from 'types/common/queryBuilder';

import { WrapperStyled } from './styles';

function LogsExplorer(): JSX.Element {
	return (
		<>
			<LogsTopNav />
			<WrapperStyled>
				<Row gutter={[0, 16]}>
					<Col xs={24}>
						<ExplorerCard sourcepage={DataSource.LOGS}>
							<LogExplorerQuerySection />
						</ExplorerCard>
					</Col>
					<Col xs={24}>
						<LogsExplorerViews />
					</Col>
				</Row>
			</WrapperStyled>
		</>
	);
}

export default LogsExplorer;
