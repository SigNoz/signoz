import { ApiV3Instance as axios } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	MetricRangePayloadV3,
	MetricsRangeProps,
} from 'types/api/metrics/getQueryRange';

export const getMetricsQueryRange = async (
	props: MetricsRangeProps,
): Promise<SuccessResponse<MetricRangePayloadV3> | ErrorResponse> => {
	try {
		const response = await axios.post('/query_range', props);

		return {
			statusCode: 200,
			error: null,
			message: response.data.status,
			payload: response.data,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
