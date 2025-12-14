import { ApiV5Instance } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	MetricRangePayloadV5,
	QueryRangePayloadV5,
} from 'types/api/v5/queryRange';

export const getQueryRangeV5 = async (
	props: QueryRangePayloadV5,
	version: string,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponseV2<MetricRangePayloadV5>> => {
	try {
		if (version && version === ENTITY_VERSION_V5) {
			const response = await ApiV5Instance.post('/query_range', props, {
				signal,
				headers,
			});

			return {
				httpStatusCode: response.status,
				data: response.data,
			};
		}

		// Default V5 behavior
		const response = await ApiV5Instance.post('/query_range', props, {
			signal,
			headers,
		});

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getQueryRangeV5;
