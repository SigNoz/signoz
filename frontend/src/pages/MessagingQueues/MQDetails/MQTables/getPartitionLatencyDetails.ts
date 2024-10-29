import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
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
	try {
		const response = await axios.post(endpoint, {
			...rest,
		});

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data.data,
		};
	} catch (error) {
		return ErrorResponseHandler((error as AxiosError) || SOMETHING_WENT_WRONG);
	}
};
