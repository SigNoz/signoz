import axios from 'api';
import { ErrorResponseHandler } from 'api/ErrorResponseHandler';
import { AxiosError } from 'axios';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

export interface MetricsListFilterValuesPayload {
	filterAttributeKeyDataType: string;
	filterKey: string;
	searchText: string;
	limit: number;
}

export interface MetricsListFilterValuesResponse {
	status: string;
	data: {
		FilterValues: BaseAutocompleteData[];
	};
}

export const getMetricsListFilterValues = async (
	props: MetricsListFilterValuesPayload,
	signal?: AbortSignal,
	headers?: Record<string, string>,
): Promise<
	SuccessResponse<MetricsListFilterValuesResponse> | ErrorResponse
> => {
	try {
		const response = await axios.post('/metrics/filters/values', props, {
			signal,
			headers,
		});

		return {
			statusCode: 200,
			error: null,
			message: 'Success',
			payload: response.data,
			params: props,
		};
	} catch (error) {
		return ErrorResponseHandler(error as AxiosError);
	}
};
