import { ApiV5Instance } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import {
	MetricRangePayloadV5,
	QueryRangePayloadV5,
} from 'types/api/v5/queryRange';

/**
 * @deprecated Use the generated `useQueryRangeV5` hook (or `queryRangeV5` fetcher) from
 * `api/generated/services/querier` instead. This hand-written client targets the
 * same endpoint and will be removed once call sites migrate.
 *
 * Part of https://github.com/SigNoz/engineering-pod/issues/5289, add a comment or update when removing this method.
 */
export const getQueryRangeV5 = async (
	props: QueryRangePayloadV5,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponseV2<MetricRangePayloadV5>> => {
	try {
		const response = await ApiV5Instance.post('/query_range', props, {
			signal,
			headers,
		});

		return {
			httpStatusCode: response.status,
			data: response.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};

export default getQueryRangeV5;
