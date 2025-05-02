import './MQDetails.style.scss';

import { Radio } from 'antd';
import { MessagingQueueServicePayload } from 'api/messagingQueues/getConsumerLagDetails';
import { getKafkaSpanEval } from 'api/messagingQueues/getKafkaSpanEval';
import { getPartitionLatencyOverview } from 'api/messagingQueues/getPartitionLatencyOverview';
import { getTopicThroughputOverview } from 'api/messagingQueues/getTopicThroughputOverview';
import useUrlQuery from 'hooks/useUrlQuery';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	MessagingQueuesViewType,
	MessagingQueuesViewTypeOptions,
	ProducerLatencyOptions,
	setConfigDetail,
} from '../MessagingQueuesUtils';
import MessagingQueuesTable from './MQTables/MQTables';

type SelectedViewType = keyof typeof MessagingQueuesViewType;

function ProducerLatencyTabs({
	option,
	setOption,
}: {
	option: ProducerLatencyOptions;
	setOption: Dispatch<SetStateAction<ProducerLatencyOptions>>;
}): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const history = useHistory();

	return (
		<Radio.Group
			onChange={(e): void => {
				setConfigDetail(urlQuery, location, history, {});
				setOption(e.target.value);
			}}
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

	const tableApiPayload: MessagingQueueServicePayload = useMemo(
		() => ({
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
		}),
		[minTime, maxTime, selectedView, option],
	);

	return (
		<div className="mq-overview-container">
			{selectedView === MessagingQueuesViewType.producerLatency.value ? (
				<ProducerLatencyTabs option={option} setOption={setOption} />
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
				option={option}
			/>
		</div>
	);
}
export default MessagingQueueOverview;
