import axios from 'api';
import { ErrorResponse, SuccessResponse } from 'types/api';

export interface QueueOverviewPayload {
	start: number;
	end: number;
	filters: {
		items: {
			key: {
				key: string;
				dataType: string;
			};
			op: string;
			value: string[];
		}[];
		op: 'AND' | 'OR';
	};
}

export interface QueueOverviewResponse {
	status: string;
	data: {
		timestamp?: string;
		data: {
			destination?: string;
			error_percentage?: number;
			kind_string?: string;
			messaging_system?: string;
			p95_latency?: number;
			service_name?: string;
			span_name?: string;
			throughput?: number;
		}[];
	}[];
}

export const getQueueOverview = async (
	props: QueueOverviewPayload,
): Promise<SuccessResponse<QueueOverviewResponse['data']> | ErrorResponse> => {
	const { start, end, filters } = props;
	const response = await axios.post(`messaging-queues/queue-overview`, {
		start,
		end,
		filters,
	});

	return {
		statusCode: 200,
		error: null,
		message: response.data.status,
		payload: response.data.data,
	};
};
