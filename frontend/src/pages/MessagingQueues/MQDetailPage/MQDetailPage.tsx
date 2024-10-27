import '../MessagingQueues.styles.scss';

import { Select, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { ListMinus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

import { MessagingQueuesViewType } from '../MessagingQueuesUtils';
import { SelectLabelWithComingSoon } from '../MQCommon/MQCommon';
import MessagingQueueOverview from '../MQDetails/MessagingQueueOverview';
import MessagingQueuesDetails from '../MQDetails/MQDetails';
import MessagingQueuesConfigOptions from '../MQGraph/MQConfigOptions';
import MessagingQueuesGraph from '../MQGraph/MQGraph';

function MQDetailPage(): JSX.Element {
	const history = useHistory();
	const [selectedView, setSelectedView] = useState<string>(
		MessagingQueuesViewType.consumerLag.value,
	);

	useEffect(() => {
		logEvent('Messaging Queues: Detail page visited', {});
	}, []);

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
						onChange={(value): void => setSelectedView(value)}
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
								label: (
									<SelectLabelWithComingSoon
										label={MessagingQueuesViewType.producerLatency.label}
									/>
								),
								value: MessagingQueuesViewType.producerLatency.value,
								disabled: true,
							},
							{
								label: (
									<SelectLabelWithComingSoon
										label={MessagingQueuesViewType.consumerLatency.label}
									/>
								),
								value: MessagingQueuesViewType.consumerLatency.value,
								disabled: true,
							},
						]}
					/>
				</div>
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			<div className="messaging-queue-main-graph">
				<MessagingQueuesConfigOptions />
				{selectedView === MessagingQueuesViewType.consumerLag.value ? (
					<MessagingQueuesGraph />
				) : (
					<MessagingQueueOverview selectedView={selectedView} />
				)}
			</div>
			<div className="messaging-queue-details">
				<MessagingQueuesDetails selectedView={selectedView} />
			</div>
		</div>
	);
}

export default MQDetailPage;
