import './MQDetails.style.scss';

import { Radio } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	MessagingQueuesViewType,
	MessagingQueuesViewTypeOptions,
	ProducerLatencyOptions,
} from '../MessagingQueuesUtils';
import { MessagingQueueServicePayload } from './MQTables/getConsumerLagDetails';
import { getKafkaSpanEval } from './MQTables/getKafkaSpanEval';
import { getPartitionLatencyOverview } from './MQTables/getPartitionLatencyOverview';
import { getTopicThroughputOverview } from './MQTables/getTopicThroughputOverview';
import MessagingQueuesTable from './MQTables/MQTables';

type SelectedViewType = keyof typeof MessagingQueuesViewType;

function PartitionLatencyTabs({
	option,
	setOption,
}: {
	option: ProducerLatencyOptions;
	setOption: Dispatch<SetStateAction<ProducerLatencyOptions>>;
}): JSX.Element {
	return (
		<Radio.Group
			onChange={(e): void => setOption(e.target.value)}
			value={option}
			className="mq-details-options"
		>
			<Radio.Button
				value={ProducerLatencyOptions.Producers}
				key={ProducerLatencyOptions.Producers}
			>
				{ProducerLatencyOptions.Producers}
			</Radio.Button>
			<Radio.Button
				value={ProducerLatencyOptions.Consumers}
				key={ProducerLatencyOptions.Consumers}
			>
				{ProducerLatencyOptions.Consumers}
			</Radio.Button>
		</Radio.Group>
	);
}

const getTableApi = (selectedView: MessagingQueuesViewTypeOptions): any => {
	if (selectedView === MessagingQueuesViewType.producerLatency.value) {
		return getTopicThroughputOverview;
	}
	if (selectedView === MessagingQueuesViewType.dropRate.value) {
		return getKafkaSpanEval;
	}
	return getPartitionLatencyOverview;
};

function MessagingQueueOverview({
	selectedView,
	option,
	setOption,
}: {
	selectedView: MessagingQueuesViewTypeOptions;
	option: ProducerLatencyOptions;
	setOption: Dispatch<SetStateAction<ProducerLatencyOptions>>;
}): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const tableApiPayload: MessagingQueueServicePayload = {
		variables: {},
		start: minTime,
		end: maxTime,
		detailType:
			// eslint-disable-next-line no-nested-ternary
			selectedView === MessagingQueuesViewType.producerLatency.value
				? option === ProducerLatencyOptions.Producers
					? 'producer'
					: 'consumer'
				: undefined,
		evalTime:
			selectedView === MessagingQueuesViewType.dropRate.value
				? 2363404
				: undefined,
	};

	return (
		<div className="mq-overview-container">
			{selectedView === MessagingQueuesViewType.producerLatency.value ? (
				<PartitionLatencyTabs option={option} setOption={setOption} />
			) : (
				<div className="mq-overview-title">
					{MessagingQueuesViewType[selectedView as SelectedViewType].label}
				</div>
			)}
			<MessagingQueuesTable
				selectedView={selectedView}
				tableApiPayload={tableApiPayload}
				tableApi={getTableApi(selectedView)}
				validConfigPresent
				type="Overview"
			/>
		</div>
	);
}
export default MessagingQueueOverview;
