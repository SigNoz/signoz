// import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { SOMETHING_WENT_WRONG } from 'constants/api';
// import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ConsumerLagDetailType } from 'pages/MessagingQueues/MessagingQueuesUtils';
import {
	consumerGrpResponse,
	networLatencyResponse,
	productDetailResponse,
} from 'pages/MessagingQueues/mocks';
// import {
// 	useMutation,
// 	UseMutationResult,
// 	useQuery,
// 	UseQueryResult,
// } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface ConsumerLagPayload {
	start: number;
	end: number;
	variables: {
		partition: string;
		topic: string;
		consumer_group: string;
	};
	detailType: ConsumerLagDetailType;
}

export interface PayloadProps {
	status: string;
	data: {
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
	props: ConsumerLagPayload,
): Promise<SuccessResponse<PayloadProps> | ErrorResponse> => {
	const {
		detailType,
		// ...restProps
	} = props;
	try {
		// const response = await axios.post(
		// 	`/messaging-queues/kafka/consumer-lag/${props.detailType}`,
		// 	{
		// 		...restProps,
		// 	},
		// );

		let responseData: any = consumerGrpResponse;
		if (detailType === ConsumerLagDetailType.ProducerDetails) {
			responseData = productDetailResponse;
		} else if (detailType === ConsumerLagDetailType.NetworkLatency) {
			responseData = networLatencyResponse;
		}

		return {
			statusCode: 200,
			error: null,
			// message: response.data.status,
			message: responseData.status,
			// payload: response.data.data,
			payload: responseData,
		};
	} catch (error) {
		return ErrorResponseHandler((error as AxiosError) || SOMETHING_WENT_WRONG);
	}
};
