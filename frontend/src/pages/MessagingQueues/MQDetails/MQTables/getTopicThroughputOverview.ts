import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

import {
	MessagingQueueServicePayload,
	MessagingQueuesPayloadProps,
} from './getConsumerLagDetails';
import { TopicThroughputProducerOverviewResponse } from './MQTableUtils';

export const getTopicThroughputOverview = async (
	props: Omit<MessagingQueueServicePayload, 'variables'>,
): Promise<
	| SuccessResponse<
			(
				| MessagingQueuesPayloadProps
				| TopicThroughputProducerOverviewResponse
			)['payload']
	  >
	| ErrorResponse
> => {
	const { detailType, start, end } = props;
	const response = await axios.post(
		`messaging-queues/kafka/topic-throughput/${detailType}`,
		{
			start,
			end,
		},
	);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};
