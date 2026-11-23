import { useMemo } from 'react';
import type { UseQueryOptions, UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import { getAttributesValues } from 'api/queryBuilder/getAttributesValues';
import type { ErrorResponse, SuccessResponse } from 'types/api';
import type {
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
