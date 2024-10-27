import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import { ConsumerLagPayload } from './MQTables/getConsumerLagDetails';
import { getPartitionLatencyOverview } from './MQTables/getPartitionLatencyOverview';
import MessagingQueuesTable from './MQTables/MQTables';

function MessagingQueueOverview({
	selectedView,
}: {
	selectedView: string;
}): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const tableApiPayload: ConsumerLagPayload = {
		variables: {},
		start: minTime,
		end: maxTime,
	};
	return (
		<div>
			<MessagingQueuesTable
				selectedView={selectedView}
				tableApiPayload={tableApiPayload}
				tableApi={getPartitionLatencyOverview}
				type="Main"
			/>
		</div>
	);
}
export default MessagingQueueOverview;
