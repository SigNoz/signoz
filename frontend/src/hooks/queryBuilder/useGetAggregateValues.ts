import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import {
	IAttributeValuesResponse,
	IGetAttributeValuesPayload,
} from 'types/api/queryBuilder/getAttributesValues';

type UseGetAttributeValues = (
	requestData: IGetAttributeValuesPayload,
	options?: UseQueryOptions<
		SuccessResponse<IAttributeValuesResponse> | ErrorResponse
	>,
) => UseQueryResult<SuccessResponse<IAttributeValuesResponse> | ErrorResponse>;

export const useGetAggregateValues: UseGetAttributeValues = (
	requestData,
	options,
) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [...options.queryKey];
		}
		return [requestData];
	}, [options?.queryKey, requestData]);

	return useQuery<SuccessResponse<IAttributeValuesResponse> | ErrorResponse>({
		queryKey,
		queryFn: () => getAttributesValues(requestData),
		...options,
	});
};
