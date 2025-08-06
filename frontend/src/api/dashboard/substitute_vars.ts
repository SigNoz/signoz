import { ApiV5Instance } from 'api';
import { ErrorResponseHandlerV2 } from 'api/ErrorResponseHandlerV2';
import { QueryRangePayloadV5 } from 'api/v5/v5';
import { AxiosError } from 'axios';
import { ErrorV2Resp, SuccessResponseV2 } from 'types/api';
import { ICompositeMetricQuery } from 'types/api/alerts/compositeQuery';

interface ISubstituteVars {
	compositeQuery: ICompositeMetricQuery;
}

export const getSubstituteVars = async (
	props?: Partial<QueryRangePayloadV5>,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponseV2<ISubstituteVars>> => {
	try {
		const response = await ApiV5Instance.post<{ data: ISubstituteVars }>(
			'/substitute_vars',
			props,
			{
				signal,
				headers,
			},
		);

		return {
			httpStatusCode: response.status,
			data: response.data.data,
		};
	} catch (error) {
		ErrorResponseHandlerV2(error as AxiosError<ErrorV2Resp>);
	}
};
