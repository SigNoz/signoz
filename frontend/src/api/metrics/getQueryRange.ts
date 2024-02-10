import { ApiV3Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	MetricRangePayloadV3,
	QueryRangePayload,
} from 'types/api/metrics/getQueryRange';

export const getMetricsQueryRange = async (
	props: QueryRangePayload,
	signal: AbortSignal,
): Promise<SuccessResponse<MetricRangePayloadV3> | ErrorResponse> => {
	try {
		const response = await axios.post('/query_range', props, { signal });

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
			params: props,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
