import '../MessagingQueues.styles.scss';

import { Select, Typography } from 'antd';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { ListMinus } from 'lucide-react';
import { useHistory } from 'react-router-dom';

import { SelectLabelWithComingSoon } from '../MQCommon/MQCommon';
import MessagingQueuesDetails from '../MQDetails/MQDetails';
import MessagingQueuesConfigOptions from '../MQGraph/MQConfigOptions';
import MessagingQueuesGraph from '../MQGraph/MQGraph';

enum MessagingQueueViewType {
	consumerLag = 'consumerLag',
	avgPartitionLatency = 'avgPartitionLatency',
	avgProducerLatency = 'avgProducerLatency',
}

function MQDetailPage(): JSX.Element {
	const history = useHistory();

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
						defaultValue="consumerLag"
						popupClassName="messaging-queue-options-popup"
						options={[
							{
								label: 'Consumer Lag view',
								value: MessagingQueueViewType.consumerLag,
							},
							{
								label: <SelectLabelWithComingSoon label="Avg. Partition latency" />,
								value: MessagingQueueViewType.avgPartitionLatency,
								disabled: true,
							},
							{
								label: <SelectLabelWithComingSoon label="Avg. Producer latency" />,
								value: MessagingQueueViewType.avgProducerLatency,
								disabled: true,
							},
						]}
					/>
				</div>
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			<div className="messaging-queue-main-graph">
				<MessagingQueuesConfigOptions />
				<MessagingQueuesGraph />
			</div>
			<div className="messaging-queue-details">
				<MessagingQueuesDetails />
			</div>
		</div>
	);
}

export default MQDetailPage;
