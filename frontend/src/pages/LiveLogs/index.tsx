import { Col, Row } from 'antd';
import BackButton from 'container/LiveLogs/BackButton';
import { liveLogsCompositeQuery } from 'container/LiveLogs/constants';
import FiltersInput from 'container/LiveLogs/FiltersInput';
import LiveLogsTopNav from 'container/LiveLogsTopNav';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';

function LiveLogs(): JSX.Element {
	useShareBuilderUrl(liveLogsCompositeQuery);

	return (
		<>
			<LiveLogsTopNav />
			<Row gutter={[0, 20]}>
				<Col span={24}>
					<BackButton />
				</Col>
				<Col span={24}>
					<FiltersInput />
				</Col>
			</Row>
		</>
	);
}

export default LiveLogs;
