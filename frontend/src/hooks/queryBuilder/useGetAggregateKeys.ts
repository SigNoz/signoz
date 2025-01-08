import { getAggregateKeys } from 'api/queryBuilder/getAttributeKeys';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { K8sCategory } from 'container/InfraMonitoringK8s/constants';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { IGetAttributeKeysPayload } from 'types/api/queryBuilder/getAttributeKeys';
import { IQueryAutocompleteResponse } from 'types/api/queryBuilder/queryAutocompleteResponse';

type UseGetAttributeKeys = (
	requestData: IGetAttributeKeysPayload,
	options?: UseQueryOptions<
		SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse
	>,
	isInfraMonitoring?: boolean,
	infraMonitoringEntity?: K8sCategory | null,
) => UseQueryResult<
	SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse
>;

export const useGetAggregateKeys: UseGetAttributeKeys = (
	requestData,
	options,
	isInfraMonitoring,
	infraMonitoringEntity,
) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [
				QueryBuilderKeys.GET_AGGREGATE_KEYS,
				...options.queryKey,
				isInfraMonitoring,
				infraMonitoringEntity,
			];
		}
		return [
			QueryBuilderKeys.GET_AGGREGATE_KEYS,
			requestData,
			isInfraMonitoring,
			infraMonitoringEntity,
		];
	}, [options?.queryKey, requestData, isInfraMonitoring, infraMonitoringEntity]);

	return useQuery<SuccessResponse<IQueryAutocompleteResponse> | ErrorResponse>({
		queryKey,
		queryFn: () => getAggregateKeys(requestData),
		...options,
	});
};
