import axios from 'api';
import { DropRateAPIResponse } from 'pages/MessagingQueues/MQDetails/DropRateView/dropRateViewUtils';
import { ErrorResponse, SuccessResponse } from 'types/api';

import { MessagingQueueServicePayload } from './getConsumerLagDetails';

export const getKafkaSpanEval = async (
	props: Omit<MessagingQueueServicePayload, 'detailType' | 'variables'>,
): Promise<SuccessResponse<DropRateAPIResponse['data']> | ErrorResponse> => {
	const { start, end, evalTime } = props;
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
};
