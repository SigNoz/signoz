import { useEffect, useState } from 'react';
import { Select } from 'antd';
import { getCurrentLocation, navigate } from 'lib/router/navigation';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { isModifierKeyPressed } from 'utils/app';
import { openInNewTab } from 'utils/navigation';

import {
	MessagingQueuesViewType,
	MessagingQueuesViewTypeOptions,
	ProducerLatencyOptions,
} from '../MessagingQueuesUtils';
import MessagingQueueOverview from '../MQDetails/MessagingQueueOverview';
import MetricPage from '../MQDetails/MetricPage/MetricPage';
import MessagingQueuesDetails from '../MQDetails/MQDetails';
import MessagingQueuesConfigOptions from '../MQGraph/MQConfigOptions';
import MessagingQueuesGraph from '../MQGraph/MQGraph';

import '../MessagingQueues.styles.scss';

function MQDetailPage(): JSX.Element {
	const [producerLatencyOption, setproducerLatencyOption] =
		useState<ProducerLatencyOptions>(ProducerLatencyOptions.Producers);

	const mqServiceView = useUrlQuery().get(
		QueryParams.mqServiceView,
	) as MessagingQueuesViewTypeOptions;
	const selectedView = Object.values(MessagingQueuesViewTypeOptions).includes(
		mqServiceView,
	)
		? mqServiceView
		: MessagingQueuesViewType.consumerLag.value;

	useEffect(() => {
		logEvent('Messaging Queues: Detail page visited', {});
	}, []);

	const updateUrlQuery = (query: Record<string, string | number>): void => {
		const searchParams = new URLSearchParams(getCurrentLocation().search);
		Object.keys(query).forEach((key) => {
			searchParams.set(key, query[key].toString());
		});
		navigate({
			search: searchParams.toString(),
		});
	};

	const showMessagingQueueDetails =
		selectedView !== MessagingQueuesViewType.metricPage.value;

	const handleBackClick = (
		event?: React.MouseEvent | React.KeyboardEvent,
	): void => {
		if (event && isModifierKeyPressed(event as React.MouseEvent)) {
			openInNewTab(ROUTES.MESSAGING_QUEUES_KAFKA);
		} else {
			navigate(ROUTES.MESSAGING_QUEUES_KAFKA);
		}
	};

	return (
		<div className="messaging-queue-container">
			<div className="messaging-header">
				<div className="header-config">
					<div
						onClick={handleBackClick}
						className="message-queue-text"
						onKeyDown={(e): void => {
							if (e.key === 'Enter' || e.key === ' ') {
								handleBackClick(e);
							}
						}}
						role="button"
						tabIndex={0}
					>
						Kafka / views /
					</div>
					<Select
						data-testid="mq-view-select"
						className="messaging-queue-options"
						defaultValue={MessagingQueuesViewType.consumerLag.value}
						popupClassName="messaging-queue-options-popup"
						onChange={(value): void => {
							updateUrlQuery({ [QueryParams.mqServiceView]: value });
						}}
						value={selectedView}
						options={[
							{
								label: MessagingQueuesViewType.consumerLag.label,
								value: MessagingQueuesViewType.consumerLag.value,
							},
							{
								label: MessagingQueuesViewType.partitionLatency.label,
								value: MessagingQueuesViewType.partitionLatency.value,
							},
							{
								label: MessagingQueuesViewType.producerLatency.label,
								value: MessagingQueuesViewType.producerLatency.value,
							},
							{
								label: MessagingQueuesViewType.metricPage.label,
								value: MessagingQueuesViewType.metricPage.value,
							},
						]}
					/>
				</div>
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			{selectedView === MessagingQueuesViewType.consumerLag.value ? (
				<div className="messaging-queue-main-graph">
					<MessagingQueuesConfigOptions />
					<MessagingQueuesGraph />
				</div>
			) : selectedView === MessagingQueuesViewType.metricPage.value ? (
				<MetricPage />
			) : (
				<MessagingQueueOverview
					selectedView={selectedView}
					option={producerLatencyOption}
					setOption={setproducerLatencyOption}
				/>
			)}
			{showMessagingQueueDetails && (
				<div className="messaging-queue-details">
					<MessagingQueuesDetails
						selectedView={selectedView}
						producerLatencyOption={producerLatencyOption}
					/>
				</div>
			)}
		</div>
	);
}

export default MQDetailPage;
