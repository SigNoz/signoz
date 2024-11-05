import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { ErrorResponse, SuccessResponse } from 'types/api';

import {
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';

export const getPartitionLatencyOverview = async (
	props: Omit<MessagingQueueServicePayload, 'detailType' | 'variables'>,
): Promise<
	SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
> => {
	try {
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
	} catch (error) {
		return ErrorResponseHandler((error as AxiosError) || SOMETHING_WENT_WRONG);
	}
};
