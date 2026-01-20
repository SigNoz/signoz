import {
	getMetricsListFilterValues,
	MetricsListFilterValuesPayload,
	MetricsListFilterValuesResponse,
} from 'api/metricsExplorer/getMetricsListFilterValues';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseGetMetricsListFilterValues = (
	payload: MetricsListFilterValuesPayload,
	options?: UseQueryOptions<
		SuccessResponse<MetricsListFilterValuesResponse> | ErrorResponse,
		Error
	>,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<MetricsListFilterValuesResponse> | ErrorResponse,
	Error
>;

export const useGetMetricsListFilterValues: UseGetMetricsListFilterValues = (
	props,
	options,
	headers,
) => {
	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [...options.queryKey];
		}
		return [props];
	}, [options?.queryKey, props]);

	return useQuery<
		SuccessResponse<MetricsListFilterValuesResponse> | ErrorResponse,
		Error
	>({
		queryFn: ({ signal }) => getMetricsListFilterValues(props, signal, headers),
		...options,
		queryKey,
	});
};
