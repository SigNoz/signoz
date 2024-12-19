import { ApiV3Instance, ApiV4Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	MetricRangePayloadV3,
	QueryRangePayload,
} from 'types/api/metrics/getQueryRange';

export const getMetricsQueryRange = async (
	props: QueryRangePayload,
	version: string,
	signal: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<MetricRangePayloadV3> | ErrorResponse> => {
	try {
		if (version && version === ENTITY_VERSION_V4) {
			const response = await ApiV4Instance.post('/query_range', props, {
				signal,
			});

			return {
				statusCode: 200,
				error: null,
				message: response.data.status,
				payload: response.data,
				params: props,
			};
		}

		const response = await ApiV3Instance.post('/query_range', props, {
			signal,
			headers,
		});

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
