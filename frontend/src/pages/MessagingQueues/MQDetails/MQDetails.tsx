import './MQDetails.style.scss';

import { Radio } from 'antd';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { isEmpty } from 'lodash-es';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	ConsumerLagDetailTitle,
	MessagingQueueServiceDetailType,
	MessagingQueuesViewType,
	ProducerLatencyOptions,
	SelectedTimelineQuery,
} from '../MessagingQueuesUtils';
import { ComingSoon } from '../MQCommon/MQCommon';
import {
	getConsumerLagDetails,
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from './MQTables/getConsumerLagDetails';
import { getPartitionLatencyDetails } from './MQTables/getPartitionLatencyDetails';
import { getTopicThroughputDetails } from './MQTables/getTopicThroughputDetails';
import MessagingQueuesTable from './MQTables/MQTables';

const MQServiceDetailTypePerView = (
	producerLatencyOption: ProducerLatencyOptions,
): {
	[x: string]: MessagingQueueServiceDetailType[];
} => ({
	[MessagingQueuesViewType.consumerLag.value]: [
		MessagingQueueServiceDetailType.ConsumerDetails,
		MessagingQueueServiceDetailType.ProducerDetails,
		MessagingQueueServiceDetailType.NetworkLatency,
		MessagingQueueServiceDetailType.PartitionHostMetrics,
	],
	[MessagingQueuesViewType.partitionLatency.value]: [
		MessagingQueueServiceDetailType.ConsumerDetails,
		MessagingQueueServiceDetailType.ProducerDetails,
	],
	[MessagingQueuesViewType.producerLatency.value]: [
		producerLatencyOption === ProducerLatencyOptions.Consumers
			? MessagingQueueServiceDetailType.ConsumerDetails
			: MessagingQueueServiceDetailType.ProducerDetails,
	],
});

interface MessagingQueuesOptionsProps {
	currentTab: MessagingQueueServiceDetailType;
	setCurrentTab: Dispatch<SetStateAction<MessagingQueueServiceDetailType>>;
	selectedView: string;
	producerLatencyOption: ProducerLatencyOptions;
}

function MessagingQueuesOptions({
	currentTab,
	setCurrentTab,
	selectedView,
	producerLatencyOption,
}: MessagingQueuesOptionsProps): JSX.Element {
	const [option, setOption] = useState<MessagingQueueServiceDetailType>(
		currentTab,
	);

	useEffect(() => {
		setOption(currentTab);
	}, [currentTab]);

	const handleChange = (value: MessagingQueueServiceDetailType): void => {
		setOption(value);
		setCurrentTab(value);
	};

	const renderRadioButtons = (): JSX.Element[] => {
		const detailTypes =
			MQServiceDetailTypePerView(producerLatencyOption)[selectedView] || [];
		return detailTypes.map((detailType) => (
			<Radio.Button
				key={detailType}
				value={detailType}
				disabled={
					detailType === MessagingQueueServiceDetailType.PartitionHostMetrics
				}
				className={
					detailType === MessagingQueueServiceDetailType.PartitionHostMetrics
						? 'disabled-option'
						: ''
				}
			>
				{ConsumerLagDetailTitle[detailType]}
				{detailType === MessagingQueueServiceDetailType.PartitionHostMetrics && (
					<ComingSoon />
				)}
			</Radio.Button>
		));
	};

	return (
		<Radio.Group
			onChange={(e): void => handleChange(e.target.value)}
			value={option}
			className="mq-details-options"
		>
			{renderRadioButtons()}
		</Radio.Group>
	);
}

interface MetaDataAndAPI {
	tableApiPayload: MessagingQueueServicePayload;
	tableApi: (
		props: MessagingQueueServicePayload,
	) => Promise<
		SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
	>;
}

interface MetaDataAndAPIPerView {
	detailType: MessagingQueueServiceDetailType;
	selectedTimelineQuery: SelectedTimelineQuery;
	configDetails?: {
		[key: string]: string;
	};
	minTime: number;
	maxTime: number;
}

export const getMetaDataAndAPIPerView = (
	metaDataProps: MetaDataAndAPIPerView,
): Record<string, MetaDataAndAPI> => {
	const {
		detailType,
		minTime,
		maxTime,
		selectedTimelineQuery,
		// configDetails,
	} = metaDataProps;
	return {
		[MessagingQueuesViewType.consumerLag.value]: {
			tableApiPayload: {
				start: (selectedTimelineQuery?.start || 0) * 1e9,
				end: (selectedTimelineQuery?.end || 0) * 1e9,
				variables: {
					partition: selectedTimelineQuery?.partition,
					topic: selectedTimelineQuery?.topic,
					consumer_group: selectedTimelineQuery?.group,
				},
				detailType,
			},
			tableApi: getConsumerLagDetails,
		},
		[MessagingQueuesViewType.partitionLatency.value]: {
			tableApiPayload: {
				start: minTime,
				end: maxTime,
				variables: {
					// partition: configDetails?.partition,
					// topic: configDetails?.topic,
					// consumer_group: configDetails?.group,

					// todo-sagar: look at above props
					partition: selectedTimelineQuery?.partition,
					topic: selectedTimelineQuery?.topic,
					consumer_group: selectedTimelineQuery?.group,
				},
				detailType,
			},
			tableApi: getPartitionLatencyDetails,
		},
		[MessagingQueuesViewType.producerLatency.value]: {
			tableApiPayload: {
				start: minTime,
				end: maxTime,
				variables: {
					// partition: configDetails?.partition,
					// topic: configDetails?.topic,
					// service_name: configDetails?.service_name,

					// todo-sagar: look at above props
					partition: selectedTimelineQuery?.partition,
					topic: selectedTimelineQuery?.topic,
					service_name: 'consumer-svc-1', // todo-sagar remove hardcode
				},
				detailType,
			},
			tableApi: getTopicThroughputDetails,
		},
	};
};

const checkValidityOfDetailConfigs = (
	selectedTimelineQuery: SelectedTimelineQuery,
	selectedView: string,
	currentTab: MessagingQueueServiceDetailType,
	// configDetails?: {
	// 	[key: string]: string;
	// },
	// eslint-disable-next-line sonarjs/cognitive-complexity
): boolean => {
	if (selectedView === MessagingQueuesViewType.consumerLag.value) {
		return !(
			isEmpty(selectedTimelineQuery) ||
			(!selectedTimelineQuery?.group &&
				!selectedTimelineQuery?.topic &&
				!selectedTimelineQuery?.partition)
		);
	}

	if (selectedView === MessagingQueuesViewType.partitionLatency.value) {
		// todo-sagar - change to configdetails
		if (isEmpty(selectedTimelineQuery)) {
			return false;
		}

		if (currentTab === MessagingQueueServiceDetailType.ConsumerDetails) {
			return Boolean(
				selectedTimelineQuery?.topic && selectedTimelineQuery?.partition,
			);
		}
		return Boolean(
			selectedTimelineQuery?.group &&
				selectedTimelineQuery?.topic &&
				selectedTimelineQuery?.partition,
		);
	}

	if (selectedView === MessagingQueuesViewType.producerLatency.value) {
		// todo-sagar - change to configdetails and add service_name
		if (isEmpty(selectedTimelineQuery)) {
			return false;
		}

		if (currentTab === MessagingQueueServiceDetailType.ProducerDetails) {
			return Boolean(
				selectedTimelineQuery?.topic && selectedTimelineQuery?.partition,
			);
		}
		return Boolean(selectedTimelineQuery?.topic);
	}

	return false;
};

function MessagingQueuesDetails({
	selectedView,
	producerLatencyOption,
}: {
	selectedView: string;
	producerLatencyOption: ProducerLatencyOptions;
}): JSX.Element {
	const [currentTab, setCurrentTab] = useState<MessagingQueueServiceDetailType>(
		MessagingQueueServiceDetailType.ConsumerDetails,
	);

	useEffect(() => {
		if (
			producerLatencyOption &&
			selectedView === MessagingQueuesViewType.producerLatency.value
		) {
			setCurrentTab(
				producerLatencyOption === ProducerLatencyOptions.Consumers
					? MessagingQueueServiceDetailType.ConsumerDetails
					: MessagingQueueServiceDetailType.ProducerDetails,
			);
		}
	}, [selectedView, producerLatencyOption]);

	const urlQuery = useUrlQuery();
	const timelineQuery = decodeURIComponent(
		urlQuery.get(QueryParams.selectedTimelineQuery) || '',
	);

	const timelineQueryData: SelectedTimelineQuery = useMemo(
		() => (timelineQuery ? JSON.parse(timelineQuery) : {}),
		[timelineQuery],
	);

	const configDetails = decodeURIComponent(
		urlQuery.get(QueryParams.configDetail) || '',
	);

	const configDetailQueryData: {
		[key: string]: string;
	} = useMemo(() => (configDetails ? JSON.parse(configDetails) : {}), [
		configDetails,
	]);

	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const serviceConfigDetails = useMemo(
		() =>
			getMetaDataAndAPIPerView({
				detailType: currentTab,
				minTime,
				maxTime,
				selectedTimelineQuery: timelineQueryData,
				configDetails: configDetailQueryData,
			}),
		[configDetailQueryData, currentTab, maxTime, minTime, timelineQueryData],
	);

	return (
		<div className="mq-details">
			<MessagingQueuesOptions
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
				selectedView={selectedView}
				producerLatencyOption={producerLatencyOption}
			/>
			<MessagingQueuesTable
				currentTab={currentTab}
				selectedView={selectedView}
				tableApi={serviceConfigDetails[selectedView].tableApi}
				validConfigPresent={checkValidityOfDetailConfigs(
					timelineQueryData,
					selectedView,
					currentTab,
					// configDetailQueryData,
				)}
				tableApiPayload={serviceConfigDetails[selectedView].tableApiPayload}
			/>
		</div>
	);
}

export default MessagingQueuesDetails;
