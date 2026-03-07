import axios from 'api';
import { MessagingQueueServiceDetailType } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { ErrorResponse, SuccessResponse } from 'types/api';

import {
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';

export const getPartitionLatencyDetails = async (
	props: MessagingQueueServicePayload,
): Promise<
	SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
> => {
	const { detailType, ...rest } = props;
	let endpoint = '';
	if (detailType === MessagingQueueServiceDetailType.ConsumerDetails) {
		endpoint = `/messaging-queues/kafka/partition-latency/consumer`;
	} else {
		endpoint = `/messaging-queues/kafka/consumer-lag/producer-details`;
	}

	const response = await axios.post(endpoint, {
		...rest,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};
