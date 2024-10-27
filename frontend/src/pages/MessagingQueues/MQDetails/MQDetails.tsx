import './MQDetails.style.scss';

import { Radio } from 'antd';
import { Dispatch, SetStateAction, useState } from 'react';

import {
	ConsumerLagDetailTitle,
	ConsumerLagDetailType,
	MessagingQueuesViewType,
} from '../MessagingQueuesUtils';
import { ComingSoon } from '../MQCommon/MQCommon';
import MessagingQueuesTable from './MQTables/MQTables';

function MessagingQueuesOptions({
	currentTab,
	setCurrentTab,
	selectedView,
}: {
	currentTab: ConsumerLagDetailType;
	setCurrentTab: Dispatch<SetStateAction<ConsumerLagDetailType>>;
	selectedView: string;
}): JSX.Element {
	const [option, setOption] = useState<ConsumerLagDetailType>(currentTab);

	return (
		<Radio.Group
			onChange={(value): void => {
				setOption(value.target.value);
				setCurrentTab(value.target.value);
			}}
			value={option}
			className="mq-details-options"
		>
			<Radio.Button value={ConsumerLagDetailType.ConsumerDetails} checked>
				{ConsumerLagDetailTitle[ConsumerLagDetailType.ConsumerDetails]}
			</Radio.Button>
			{selectedView !== MessagingQueuesViewType.partitionLatency.value && (
				<Radio.Button value={ConsumerLagDetailType.ProducerDetails}>
					{ConsumerLagDetailTitle[ConsumerLagDetailType.ProducerDetails]}
				</Radio.Button>
			)}
			{selectedView !== MessagingQueuesViewType.partitionLatency.value && (
				<Radio.Button value={ConsumerLagDetailType.NetworkLatency}>
					{ConsumerLagDetailTitle[ConsumerLagDetailType.NetworkLatency]}
				</Radio.Button>
			)}
			{selectedView !== MessagingQueuesViewType.partitionLatency.value && (
				<Radio.Button
					value={ConsumerLagDetailType.PartitionHostMetrics}
					disabled
					className="disabled-option"
				>
					{ConsumerLagDetailTitle[ConsumerLagDetailType.PartitionHostMetrics]}
					<ComingSoon />
				</Radio.Button>
			)}
		</Radio.Group>
	);
}

function MessagingQueuesDetails({
	selectedView,
}: {
	selectedView: string;
}): JSX.Element {
	const [currentTab, setCurrentTab] = useState<ConsumerLagDetailType>(
		ConsumerLagDetailType.ConsumerDetails,
	);

	return (
		<div className="mq-details">
			<MessagingQueuesOptions
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
				selectedView={selectedView}
			/>
			<MessagingQueuesTable
				currentTab={currentTab}
				selectedView={selectedView}
				type="Detail"
			/>
		</div>
	);
}

export default MessagingQueuesDetails;
