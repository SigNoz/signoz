import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export interface MetricsListFilterKeysResponse {
	status: string;
	data: {
		metricColumns: string[];
		attributeKeys: BaseAutocompleteData[];
	};
}

export interface GetMetricsListFilterKeysParams {
	searchText: string;
	limit?: number;
}

export const getMetricsListFilterKeys = async (
	params: GetMetricsListFilterKeysParams,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<SuccessResponse<MetricsListFilterKeysResponse> | ErrorResponse> => {
	try {
		const response = await axios.get('/metrics/filters/keys', {
			params: {
				searchText: params.searchText,
				limit: params.limit,
			},
			signal,
			headers,
		});

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
