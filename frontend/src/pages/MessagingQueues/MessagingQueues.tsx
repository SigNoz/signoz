import './MessagingQueues.styles.scss';

import { Button, Select } from 'antd';
import { QueryParams } from 'constants/query';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { ListMinus, Undo } from 'lucide-react';
import { useHistory, useLocation } from 'react-router-dom';

import { SelectLabelWithComingSoon } from './MQCommon/MQCommon';
import MessagingQueuesDetails from './MQDetails/MQDetails';
import MessagingQueuesConfigOptions from './MQGraph/MQConfigOptions';
import MessagingQueuesGraph from './MQGraph/MQGraph';

function MessagingQueues(): JSX.Element {
	const urlQuery = useUrlQuery();
	const location = useLocation();
	const history = useHistory();

	const onReset = (): void => {
		urlQuery.set(QueryParams.relativeTime, '30m');
		const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
		history.replace(generatedUrl);
	};

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
						popupClassName="messaging-queue-options-popup"
						options={[
							{ label: 'Consumer Lag view', value: 'consumerLag' },
							{
								label: <SelectLabelWithComingSoon label="Avg. Partition latency" />,
								value: 'avgPartitionLatency',
								disabled: true,
							},
							{
								label: <SelectLabelWithComingSoon label="Avg. Producer latency" />,
								value: 'avgProducerLatency',
								disabled: true,
							},
						]}
					/>
				</div>
				<div className="detail-page-timeselector">
					<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
					<Button
						type="text"
						icon={<Undo size={14} />}
						className="reset-btn"
						onClick={onReset}
					>
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
