import axios from 'api';
import { MessagingQueueServiceDetailType } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface MessagingQueueServicePayload {
	start?: number | string;
	end?: number | string;
	variables?: {
		partition?: string;
		topic?: string;
		consumer_group?: string;
		service_name?: string;
	};
	detailType?: MessagingQueueServiceDetailType | 'producer' | 'consumer';
	evalTime?: number;
}

export interface MessagingQueuesPayloadProps {
	status: string;
	payload: {
		resultType: string;
		result: {
			table: {
				columns: {
					name: string;
					queryName: string;
					isValueColumn: boolean;
				}[];
				rows: {
					data: Record<string, string>;
				}[];
			};
		}[];
	};
}

export const getConsumerLagDetails = async (
	props: MessagingQueueServicePayload,
): Promise<
	SuccessResponse<MessagingQueuesPayloadProps['payload']> | ErrorResponse
> => {
	const { detailType, ...restProps } = props;
	const response = await axios.post(
		`/messaging-queues/kafka/consumer-lag/${props.detailType}`,
		{
			...restProps,
		},
	);

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};
