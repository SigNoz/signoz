import { isAxiosError } from 'axios';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { updateBarStepInterval } from 'container/GridCardLayout/utils';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { SuccessResponse, Warning } from 'types/api';
import { IDashboardVariable } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { DataSource } from 'types/common/queryBuilder';

type UseGetQueryRangeOptions = UseQueryOptions<
	SuccessResponse<MetricRangePayloadProps> & { warning?: Warning },
	APIError | Error
>;

type UseGetQueryRange = (
	requestData: GetQueryResultsProps,
	version: string,
	options?: UseGetQueryRangeOptions,
	headers?: Record<string, string>,
) => UseQueryResult<
	SuccessResponse<MetricRangePayloadProps> & { warning?: Warning },
	Error
>;

export const useGetQueryRange: UseGetQueryRange = (
	requestData,
	version,
	options,
	headers,
) => {
	const { selectedDashboard } = useDashboard();

	const dynamicVariables = useMemo(
		() =>
			Object.values(selectedDashboard?.data?.variables || {})?.filter(
				(variable: IDashboardVariable) => variable.type === 'DYNAMIC',
			),
		[selectedDashboard],
	);

	const newRequestData: GetQueryResultsProps = useMemo(() => {
		const firstQueryData = requestData.query.builder?.queryData[0];
		const isListWithSingleTimestampOrder =
			requestData.graphType === PANEL_TYPES.LIST &&
			firstQueryData?.orderBy?.length === 1 &&
			// exclude list with id filter (i.e. context logs)
			!firstQueryData?.filters?.items.some((filter) => filter.key?.key === 'id') &&
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

			const updatedQuery = updateBarStepInterval(
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

	const retry = useMemo(() => {
		if (options?.retry !== undefined) {
			return options.retry;
		}
		return (failureCount: number, error: Error): boolean => {
			let status: number | undefined;

			if (error instanceof APIError) {
				status = error.getHttpStatusCode();
			} else if (isAxiosError(error)) {
				status = error.response?.status;
			}

			if (status && status >= 400 && status < 500) {
				return false;
			}

			return failureCount < 3;
		};
	}, [options?.retry]);

	return useQuery<
		SuccessResponse<MetricRangePayloadProps> & { warning?: Warning },
		APIError | Error
	>({
		queryFn: async ({ signal }) =>
			GetMetricQueryRange(
				modifiedRequestData,
				version,
				dynamicVariables,
				signal,
				headers,
			),
		...options,
		retry,
		queryKey,
	});
};
