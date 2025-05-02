/* eslint-disable no-nested-ternary */
import '../MessagingQueues.styles.scss';

import { Select } from 'antd';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import {
	MessagingQueuesViewType,
	MessagingQueuesViewTypeOptions,
	ProducerLatencyOptions,
} from '../MessagingQueuesUtils';
import DropRateView from '../MQDetails/DropRateView/DropRateView';
import MessagingQueueOverview from '../MQDetails/MessagingQueueOverview';
import MetricPage from '../MQDetails/MetricPage/MetricPage';
import MessagingQueuesDetails from '../MQDetails/MQDetails';
import MessagingQueuesConfigOptions from '../MQGraph/MQConfigOptions';
import MessagingQueuesGraph from '../MQGraph/MQGraph';

function MQDetailPage(): JSX.Element {
	const history = useHistory();
	const [
		selectedView,
		setSelectedView,
	] = useState<MessagingQueuesViewTypeOptions>(
		MessagingQueuesViewType.consumerLag.value,
	);

	const [
		producerLatencyOption,
		setproducerLatencyOption,
	] = useState<ProducerLatencyOptions>(ProducerLatencyOptions.Producers);

	const mqServiceView = useUrlQuery().get(
		QueryParams.mqServiceView,
	) as MessagingQueuesViewTypeOptions;

	useEffect(() => {
		logEvent('Messaging Queues: Detail page visited', {});
	}, []);

	useEffect(() => {
		if (mqServiceView) {
			setSelectedView(mqServiceView);
		}
	}, [mqServiceView]);

	const updateUrlQuery = (query: Record<string, string | number>): void => {
		const searchParams = new URLSearchParams(history.location.search);
		Object.keys(query).forEach((key) => {
			searchParams.set(key, query[key].toString());
		});
		history.push({
			search: searchParams.toString(),
		});
	};

	const showMessagingQueueDetails =
		selectedView !== MessagingQueuesViewType.dropRate.value &&
		selectedView !== MessagingQueuesViewType.metricPage.value;

	const handleBackClick = (): void => {
		history.push(ROUTES.MESSAGING_QUEUES_KAFKA);
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
								handleBackClick();
							}
						}}
						role="button"
						tabIndex={0}
					>
						Kafka / views /
					</div>
					<Select
						className="messaging-queue-options"
						defaultValue={MessagingQueuesViewType.consumerLag.value}
						popupClassName="messaging-queue-options-popup"
						onChange={(value): void => {
							setSelectedView(value);
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
								label: MessagingQueuesViewType.dropRate.label,
								value: MessagingQueuesViewType.dropRate.value,
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
			) : selectedView === MessagingQueuesViewType.dropRate.value ? (
				<DropRateView />
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
