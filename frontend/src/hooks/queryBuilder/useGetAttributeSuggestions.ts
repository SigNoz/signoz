import { getAttributeSuggestions } from 'api/queryBuilder/getAttributeSuggestions';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	IGetAttributeSuggestionsPayload,
	IGetAttributeSuggestionsSuccessResponse,
} from 'types/api/queryBuilder/getAttributeSuggestions';

type UseGetAttributeSuggestions = (
	requestData: IGetAttributeSuggestionsPayload,
	options?: UseQueryOptions<
		SuccessResponse<IGetAttributeSuggestionsSuccessResponse> | ErrorResponse
	>,
) => UseQueryResult<
	SuccessResponse<IGetAttributeSuggestionsSuccessResponse> | ErrorResponse
>;

export const useGetAttributeSuggestions: UseGetAttributeSuggestions = (
	requestData,
	options,
) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [QueryBuilderKeys.GET_ATTRIBUTE_SUGGESTIONS, ...options.queryKey];
		}
		return [QueryBuilderKeys.GET_ATTRIBUTE_SUGGESTIONS, requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<
		SuccessResponse<IGetAttributeSuggestionsSuccessResponse> | ErrorResponse
	>({
		queryKey,
		queryFn: () => getAttributeSuggestions(requestData),
		...options,
	});
};
