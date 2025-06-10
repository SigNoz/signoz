import { ApiV5Instance } from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	MetricRangePayloadV5,
	QueryRangePayloadV5,
} from 'types/api/v5/queryRange';

export const getQueryRangeV5 = async (
	props: QueryRangePayloadV5,
	version: string,
	signal: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<MetricRangePayloadV5> | ErrorResponse> => {
	try {
		if (version && version === ENTITY_VERSION_V5) {
			const response = await ApiV5Instance.post('/query_range', props, {
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
		}

		// Default V5 behavior
		const response = await ApiV5Instance.post('/query_range', props, {
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

export default getQueryRangeV5;
