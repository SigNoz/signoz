import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { updateStepInterval } from 'container/GridCardLayout/utils';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';

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
		const firstQueryData = requestData.query.builder?.queryData[0];
		const isListWithSingleTimestampOrder =
			requestData.graphType === PANEL_TYPES.LIST &&
			firstQueryData?.orderBy?.length === 1 &&
			// exclude list with id filter (i.e. context logs)
			!firstQueryData?.filters.items.some((filter) => filter.key?.key === 'id') &&
			firstQueryData?.orderBy[0].columnName === 'timestamp';

		const modifiedRequestData = {
			...requestData,
			graphType:
				requestData.graphType === PANEL_TYPES.BAR
					? PANEL_TYPES.TIME_SERIES
					: requestData.graphType,
		};

		// If the query is a list with a single timestamp order, we need to add the id column to the order by clause
		if (
			isListWithSingleTimestampOrder &&
			firstQueryData?.dataSource === DataSource.LOGS
		) {
			modifiedRequestData.query.builder = {
				...requestData.query.builder,
				queryData: [
					{
						...firstQueryData,
						orderBy: [
							...(firstQueryData?.orderBy || []),
							{
								columnName: 'id',
								order: firstQueryData?.orderBy[0]?.order,
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

	const modifiedRequestData = useMemo(() => {
		const graphType = requestData.originalGraphType || requestData.graphType;
		if (graphType === PANEL_TYPES.BAR) {
			const { start, end } = getStartEndRangeTime({
				type: requestData.selectedTime,
				interval: requestData.globalSelectedInterval,
			});

			const updatedQuery = updateStepInterval(
				requestData.query,
				requestData.start ? requestData.start * 1e3 : parseInt(start, 10) * 1e3,
				requestData.end ? requestData.end * 1e3 : parseInt(end, 10) * 1e3,
			);

			return {
				...requestData,
				query: updatedQuery,
			};
		}

		return requestData;
	}, [requestData]);

	return useQuery<SuccessResponse<MetricRangePayloadProps>, Error>({
		queryFn: async ({ signal }) =>
			GetMetricQueryRange(modifiedRequestData, version, signal, headers),
		...options,
		queryKey,
	});
};
