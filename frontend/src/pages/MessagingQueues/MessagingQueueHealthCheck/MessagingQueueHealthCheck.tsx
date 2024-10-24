/* eslint-disable sonarjs/no-duplicate-string */
import './MessagingQueueHealthCheck.styles.scss';

import { useOnboardingStatus } from 'hooks/messagingQueue / onboarding/useOnboardingStatus';
import { useEffect, useState } from 'react';

import AttributeCheckList from './AttributeCheckList';

interface MessagingQueueHealthCheckProps {
	visible: boolean;
	onClose: () => void;
}

function MessagingQueueHealthCheck({
	visible,
	onClose,
}: MessagingQueueHealthCheckProps): JSX.Element {
	const [loading, setLoading] = useState(false);

	// Consumer Data
	const {
		data: consumerData,
		error: consumerError,
		isFetching: consumerLoading,
	} = useOnboardingStatus({ enabled: visible }, 'consumers');

	// Producer Data
	const {
		data: producerData,
		error: producerError,
		isFetching: producerLoading,
	} = useOnboardingStatus({ enabled: visible }, 'producers');

	// Kafka Data
	const {
		data: kafkaData,
		error: kafkaError,
		isFetching: kafkaLoading,
	} = useOnboardingStatus({ enabled: visible }, 'kafka');

	// combined loading and update state
	useEffect(() => {
		setLoading(consumerLoading || producerLoading || kafkaLoading);
	}, [consumerLoading, producerLoading, kafkaLoading]);

	return (
		<AttributeCheckList
			visible={visible}
			onClose={onClose}
			onboardingStatusResponses={[
				{
					title: 'Consumer',
					data: consumerData?.payload?.data || [],
					errorMsg: (consumerError || consumerData?.error) as string,
				},
				{
					title: 'Producer',
					data: producerData?.payload?.data || [],
					errorMsg: (producerError || producerData?.error) as string,
				},
				{
					title: 'Kafka',
					data: kafkaData?.payload?.data || [],
					errorMsg: (kafkaError || kafkaData?.error) as string,
				},
			]}
			loading={loading}
		/>
	);
}

export default MessagingQueueHealthCheck;
