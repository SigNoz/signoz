import { Row } from 'antd';
import BackButton from 'container/LiveLogs/BackButton';
import { liveLogsCompositeQuery } from 'container/LiveLogs/constants';
import LiveLogsTopNav from 'container/LiveLogsTopNav';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';

function LiveLogs(): JSX.Element {
	useShareBuilderUrl(liveLogsCompositeQuery);

	return (
		<>
			<LiveLogsTopNav />
			<Row>
				<BackButton />
			</Row>
		</>
	);
}

export default LiveLogs;
