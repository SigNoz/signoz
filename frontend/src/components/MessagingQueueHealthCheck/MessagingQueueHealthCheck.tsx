/* eslint-disable sonarjs/no-duplicate-string */
import './MessagingQueueHealthCheck.styles.scss';

import { Button } from 'antd';
import cx from 'classnames';
import { useOnboardingStatus } from 'hooks/messagingQueue/useOnboardingStatus';
import { Bolt, FolderTree } from 'lucide-react';
import { MessagingQueueHealthCheckService } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { useEffect, useMemo, useState } from 'react';

import AttributeCheckList from './AttributeCheckList';

interface MessagingQueueHealthCheckProps {
	serviceToInclude: string[];
}

function MessagingQueueHealthCheck({
	serviceToInclude,
}: MessagingQueueHealthCheckProps): JSX.Element {
	const [loading, setLoading] = useState(false);
	const [checkListOpen, setCheckListOpen] = useState(false);

	// Consumer Data
	const {
		data: consumerData,
		error: consumerError,
		isFetching: consumerLoading,
	} = useOnboardingStatus(
		{
			enabled: !!serviceToInclude.filter(
				(service) => service === MessagingQueueHealthCheckService.Consumers,
			).length,
		},
		MessagingQueueHealthCheckService.Consumers,
	);

	// Producer Data
	const {
		data: producerData,
		error: producerError,
		isFetching: producerLoading,
	} = useOnboardingStatus(
		{
			enabled: !!serviceToInclude.filter(
				(service) => service === MessagingQueueHealthCheckService.Producers,
			).length,
		},
		MessagingQueueHealthCheckService.Producers,
	);

	// Kafka Data
	const {
		data: kafkaData,
		error: kafkaError,
		isFetching: kafkaLoading,
	} = useOnboardingStatus(
		{
			enabled: !!serviceToInclude.filter(
				(service) => service === MessagingQueueHealthCheckService.Kafka,
			).length,
		},
		MessagingQueueHealthCheckService.Kafka,
	);

	// combined loading and update state
	useEffect(() => {
		setLoading(consumerLoading || producerLoading || kafkaLoading);
	}, [consumerLoading, producerLoading, kafkaLoading]);

	const missingConfiguration = useMemo(() => {
		const consumerMissing =
			(serviceToInclude.includes(MessagingQueueHealthCheckService.Consumers) &&
				consumerData?.payload?.data?.filter((item) => item.status === '0')
					.length) ||
			0;
		const producerMissing =
			(serviceToInclude.includes(MessagingQueueHealthCheckService.Producers) &&
				producerData?.payload?.data?.filter((item) => item.status === '0')
					.length) ||
			0;
		const kafkaMissing =
			(serviceToInclude.includes(MessagingQueueHealthCheckService.Kafka) &&
				kafkaData?.payload?.data?.filter((item) => item.status === '0').length) ||
			0;

		return consumerMissing + producerMissing + kafkaMissing;
	}, [consumerData, producerData, kafkaData, serviceToInclude]);

	return (
		<div>
			<Button
				onClick={(): void => setCheckListOpen(true)}
				loading={loading}
				className={cx(
					'config-btn',
					missingConfiguration ? 'missing-config-btn' : '',
				)}
				icon={<Bolt size={12} />}
			>
				<div className="config-btn-content">
					{missingConfiguration
						? `Missing Configuration (${missingConfiguration})`
						: 'Configuration'}
				</div>
				<FolderTree size={14} />
			</Button>
			<AttributeCheckList
				visible={checkListOpen}
				onClose={(): void => setCheckListOpen(false)}
				onboardingStatusResponses={[
					{
						title: 'Consumers',
						data: consumerData?.payload?.data || [],
						errorMsg: (consumerError || consumerData?.error) as string,
					},
					{
						title: 'Producers',
						data: producerData?.payload?.data || [],
						errorMsg: (producerError || producerData?.error) as string,
					},
					{
						title: 'Kafka',
						data: kafkaData?.payload?.data || [],
						errorMsg: (kafkaError || kafkaData?.error) as string,
					},
				].filter((item) => serviceToInclude.includes(item.title.toLowerCase()))}
				loading={loading}
			/>
		</div>
	);
}

export default MessagingQueueHealthCheck;
