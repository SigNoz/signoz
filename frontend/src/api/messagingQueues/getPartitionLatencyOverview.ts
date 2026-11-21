import axios from 'api';
import type { ErrorResponse, SuccessResponse } from 'types/api';

import type {
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';

export const getPartitionLatencyOverview = async (
	props: Omit<MessagingQueueServicePayload, 'detailType' | 'variables'>,
): Promise<
	SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
> => {
	const response = await axios.post(
		`/messaging-queues/kafka/partition-latency/overview`,
		{
			...props,
		},
	);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};
