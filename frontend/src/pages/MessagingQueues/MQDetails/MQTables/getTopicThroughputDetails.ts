import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

import {
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';

export const getTopicThroughputDetails = async (
	props: MessagingQueueServicePayload,
): Promise<
	SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
> => {
	const { detailType, ...rest } = props;
	const endpoint = `/messaging-queues/kafka/topic-throughput/${detailType}`;
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
