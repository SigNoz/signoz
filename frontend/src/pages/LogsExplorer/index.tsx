import { Col, Row } from 'antd';
import LogExplorerQuerySection from 'container/LogExplorerQuerySection';
import LogsExplorerViews from 'container/LogsExplorerViews';

// ** Styles
import { WrapperStyled } from './styles';

function LogsExplorer(): JSX.Element {
	return (
		<WrapperStyled>
			<Row gutter={[0, 28]}>
				<Col xs={24}>
					<LogExplorerQuerySection />
				</Col>
				<Col xs={24}>
					<LogsExplorerViews />
				</Col>
			</Row>
		</WrapperStyled>
	);
}

export default LogsExplorer;
