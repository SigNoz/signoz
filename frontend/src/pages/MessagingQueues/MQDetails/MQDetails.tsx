import './MQDetails.style.scss';

import { Radio } from 'antd';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { isEmpty } from 'lodash-es';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	ConsumerLagDetailTitle,
	getMetaDataAndAPIPerView,
	MessagingQueueServiceDetailType,
	MessagingQueuesViewType,
	MessagingQueuesViewTypeOptions,
	ProducerLatencyOptions,
	SelectedTimelineQuery,
} from '../MessagingQueuesUtils';
import MessagingQueuesTable from './MQTables/MQTables';

const MQServiceDetailTypePerView = (
	producerLatencyOption: ProducerLatencyOptions,
): Record<string, MessagingQueueServiceDetailType[]> => ({
	[MessagingQueuesViewType.consumerLag.value]: [
		MessagingQueueServiceDetailType.ProducerDetails,
		MessagingQueueServiceDetailType.ConsumerDetails,
		MessagingQueueServiceDetailType.NetworkLatency,
	],
	[MessagingQueuesViewType.partitionLatency.value]: [
		MessagingQueueServiceDetailType.ProducerDetails,
		MessagingQueueServiceDetailType.ConsumerDetails,
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
	selectedView: MessagingQueuesViewTypeOptions;
	producerLatencyOption: ProducerLatencyOptions;
}

function MessagingQueuesOptions({
	currentTab,
	setCurrentTab,
	selectedView,
	producerLatencyOption,
}: MessagingQueuesOptionsProps): JSX.Element {
	const handleChange = (value: MessagingQueueServiceDetailType): void => {
		setCurrentTab(value);
	};

	const renderRadioButtons = (): JSX.Element[] => {
		const detailTypes =
			MQServiceDetailTypePerView(producerLatencyOption)[selectedView] || [];
		return detailTypes.map((detailType) => (
			<Radio.Button key={detailType} value={detailType}>
				{ConsumerLagDetailTitle[detailType]}
			</Radio.Button>
		));
	};

	return (
		<Radio.Group
			onChange={(e): void => handleChange(e.target.value)}
			value={currentTab}
			className="mq-details-options"
		>
			{renderRadioButtons()}
		</Radio.Group>
	);
}

const checkValidityOfDetailConfigs = (
	selectedTimelineQuery: SelectedTimelineQuery,
	selectedView: MessagingQueuesViewTypeOptions,
	currentTab: MessagingQueueServiceDetailType,
	configDetails?: {
		[key: string]: string;
	},
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
		if (isEmpty(configDetails)) {
			return false;
		}

		return Boolean(configDetails?.topic && configDetails?.partition);
	}

	if (selectedView === MessagingQueuesViewType.producerLatency.value) {
		if (isEmpty(configDetails)) {
			return false;
		}

		return Boolean(configDetails?.topic && configDetails?.service_name);
	}

	return selectedView === MessagingQueuesViewType.dropRate.value;
};

function MessagingQueuesDetails({
	selectedView,
	producerLatencyOption,
}: {
	selectedView: MessagingQueuesViewTypeOptions;
	producerLatencyOption: ProducerLatencyOptions;
}): JSX.Element {
	const [currentTab, setCurrentTab] = useState<MessagingQueueServiceDetailType>(
		MessagingQueueServiceDetailType.ProducerDetails,
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
				tableApi={serviceConfigDetails[selectedView]?.tableApi}
				validConfigPresent={checkValidityOfDetailConfigs(
					timelineQueryData,
					selectedView,
					currentTab,
					configDetailQueryData,
				)}
				tableApiPayload={serviceConfigDetails[selectedView]?.tableApiPayload}
			/>
		</div>
	);
}

export default MessagingQueuesDetails;
