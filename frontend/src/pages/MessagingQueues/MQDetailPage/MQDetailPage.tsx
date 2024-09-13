import '../MessagingQueues.styles.scss';

import { Select, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import ROUTES from 'constants/routes';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { ListMinus } from 'lucide-react';
import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import { MessagingQueuesViewType } from '../MessagingQueuesUtils';
import { SelectLabelWithComingSoon } from '../MQCommon/MQCommon';
import MessagingQueuesDetails from '../MQDetails/MQDetails';
import MessagingQueuesConfigOptions from '../MQGraph/MQConfigOptions';
import MessagingQueuesGraph from '../MQGraph/MQGraph';

function MQDetailPage(): JSX.Element {
	const history = useHistory();

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
						options={[
							{
								label: MessagingQueuesViewType.consumerLag.label,
								value: MessagingQueuesViewType.consumerLag.value,
							},
							{
								label: (
									<SelectLabelWithComingSoon
										label={MessagingQueuesViewType.partitionLatency.label}
									/>
								),
								value: MessagingQueuesViewType.partitionLatency.value,
								disabled: true,
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
				<MessagingQueuesGraph />
			</div>
			<div className="messaging-queue-details">
				<MessagingQueuesDetails />
			</div>
		</div>
	);
}

export default MQDetailPage;
