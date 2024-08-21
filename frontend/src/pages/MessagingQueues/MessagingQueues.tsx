import './MessagingQueues.styles.scss';

import { Button, Select } from 'antd';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { ListMinus, Undo } from 'lucide-react';

import MessagingQueuesDetails from './MQDetails/MQDetails';
import MessagingQueuesConfigOptions from './MQGraph/MQConfigOptions';
import MessagingQueuesGraph from './MQGraph/MQGraph';

function MessagingQueues(): JSX.Element {
	return (
		<div className="messaging-queue-container">
			<div className="messaging-breadcrumb">
				<ListMinus size={16} />
				Messaging Queues
			</div>
			<div className="messaging-header">
				<div className="header-config">
					Kafka / views /
					<Select
						className="messaging-queue-options"
						defaultValue="consumerLag"
						options={[
							{ label: 'Consumer Lag view', value: 'consumerLag' },
							{ label: 'Avg. Partition latency', value: 'avgPartitionLatency' },
							{ label: 'Avg. Producer latency', value: 'avgProducerLatency' },
						]}
					/>
				</div>
				<div className="detail-page-timeselector">
					<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
					<Button type="text" icon={<Undo size={14} />} className="reset-btn">
						Reset
					</Button>
				</div>
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

export default MessagingQueues;
