import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

type UseGetQueryRange = (
	requestData: GetQueryResultsProps,
	version: string,
	options?: UseQueryOptions<SuccessResponse<MetricRangePayloadProps>, Error>,
	headers?: Record<string, string>,
) => UseQueryResult<SuccessResponse<MetricRangePayloadProps>, Error>;

export const useGetQueryRange: UseGetQueryRange = (
	requestData,
	version,
	options,
	headers,
) => {
	const newRequestData: GetQueryResultsProps = useMemo(() => {
		const isListWithSingleTimestampOrder =
			requestData.graphType === PANEL_TYPES.LIST &&
			requestData.query.builder?.queryData[0]?.orderBy?.length === 1 &&
			requestData.query.builder?.queryData[0].orderBy[0].columnName ===
				'timestamp';

		const modifiedRequestData = {
			...requestData,
			graphType:
				requestData.graphType === PANEL_TYPES.BAR
					? PANEL_TYPES.TIME_SERIES
					: requestData.graphType,
		};

		// If the query is a list with a single timestamp order, we need to add the id column to the order by clause
		if (isListWithSingleTimestampOrder) {
			modifiedRequestData.query.builder = {
				...requestData.query.builder,
				queryData: [
					{
						...requestData.query.builder.queryData[0],
						orderBy: [
							...requestData.query.builder.queryData[0].orderBy,
							{
								columnName: 'id',
								order: requestData.query.builder.queryData[0].orderBy[0].order,
							},
						],
					},
				],
			};
		}

		return modifiedRequestData;
	}, [requestData]);

	const queryKey = useMemo(() => {
		if (options?.queryKey && Array.isArray(options.queryKey)) {
			return [...options.queryKey];
		}

		if (options?.queryKey && typeof options.queryKey === 'string') {
			return options.queryKey;
		}

		return [REACT_QUERY_KEY.GET_QUERY_RANGE, newRequestData];
	}, [options?.queryKey, newRequestData]);

	return useQuery<SuccessResponse<MetricRangePayloadProps>, Error>({
		queryFn: async ({ signal }) =>
			GetMetricQueryRange(requestData, version, signal, headers),
		...options,
		queryKey,
	});
};
