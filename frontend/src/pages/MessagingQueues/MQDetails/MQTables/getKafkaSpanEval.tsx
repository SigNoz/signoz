import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { ErrorResponse, SuccessResponse } from 'types/api';

import {
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';

export const getKafkaSpanEval = async (
	props: Omit<MessagingQueueServicePayload, 'detailType' | 'variables'>,
): Promise<
	SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
> => {
	const { start, end, evalTime } = props;
	try {
		const response = await axios.post(`messaging-queues/kafka/span/evaluation`, {
			start,
			end,
			eval_time: evalTime,
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
