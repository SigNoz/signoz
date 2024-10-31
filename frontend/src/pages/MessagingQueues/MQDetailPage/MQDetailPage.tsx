import '../MessagingQueues.styles.scss';

import { Select, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { ListMinus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import {
	MessagingQueuesViewType,
	MessagingQueuesViewTypeOptions,
	ProducerLatencyOptions,
} from '../MessagingQueuesUtils';
import MessagingQueueOverview from '../MQDetails/MessagingQueueOverview';
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

	return (
		<div className="messaging-queue-container">
			<div className="messaging-breadcrumb">
				<ListMinus size={16} />
				<Typography.Text
					onClick={(): void => history.push(ROUTES.MESSAGING_QUEUES)}
					className="message-queue-text"
				>
					Messaging Queues
				</Typography.Text>
			</div>
			<div className="messaging-header">
				<div className="header-config">
					Kafka / views /
					<Select
						className="messaging-queue-options"
						defaultValue={MessagingQueuesViewType.consumerLag.value}
						popupClassName="messaging-queue-options-popup"
						onChange={(value): void => {
							setSelectedView(value);
							updateUrlQuery({ [QueryParams.mqServiceView]: value });
						}}
						value={mqServiceView}
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
						]}
					/>
				</div>
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			<div className="messaging-queue-main-graph">
				{selectedView === MessagingQueuesViewType.consumerLag.value ? (
					<>
						<MessagingQueuesConfigOptions />
						<MessagingQueuesGraph />
					</>
				) : (
					<MessagingQueueOverview
						selectedView={selectedView}
						option={producerLatencyOption}
						setOption={setproducerLatencyOption}
					/>
				)}
			</div>
			<div className="messaging-queue-details">
				{selectedView !== MessagingQueuesViewType.dropRate.value && (
					<MessagingQueuesDetails
						selectedView={selectedView}
						producerLatencyOption={producerLatencyOption}
					/>
				)}
			</div>
		</div>
	);
}

export default MQDetailPage;
