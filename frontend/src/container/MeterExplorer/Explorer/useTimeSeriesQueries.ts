import { useEffect, useMemo } from 'react';
import { useQueries } from 'react-query';
import { isAxiosError } from 'axios';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { initialQueryMeterWithType, PANEL_TYPES } from 'constants/queryBuilder';
import { MAX_QUERY_RETRIES } from 'constants/reactQuery';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { convertDataValueToMs } from 'container/TimeSeriesView/utils';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { SuccessResponse } from 'types/api';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

interface UseTimeSeriesQueriesProps {
	stagedQuery: Query | null;
	currentQuery: Query;
	globalSelectedTime: Time | CustomTimeType;
	maxTime: number;
	minTime: number;
	onFetchingStateChange?: (isFetching: boolean) => void;
}

interface UseTimeSeriesQueriesResult {
	responseData: (SuccessResponse<MetricRangePayloadProps> | undefined)[];
	isLoading: boolean;
	isError: boolean;
}

export function useTimeSeriesQueries({
	stagedQuery,
	currentQuery,
	globalSelectedTime,
	maxTime,
	minTime,
	onFetchingStateChange,
}: UseTimeSeriesQueriesProps): UseTimeSeriesQueriesResult {
	const { showErrorModal } = useErrorModal();

	const isValidToConvertToMs = useMemo(() => {
		const isValid: boolean[] = [];

		currentQuery.builder.queryData.forEach(
			({ aggregateAttribute, aggregateOperator }) => {
				const isExistDurationNanoAttribute =
					aggregateAttribute?.key === 'durationNano' ||
					aggregateAttribute?.key === 'duration_nano';

				const isCountOperator =
					aggregateOperator === 'count' || aggregateOperator === 'count_distinct';

				isValid.push(!isCountOperator && isExistDurationNanoAttribute);
			},
		);

		return isValid.every(Boolean);
	}, [currentQuery]);

	const queryPayloads = useMemo(
		() => [stagedQuery || initialQueryMeterWithType],
		[stagedQuery],
	);

	const queries = useQueries(
		queryPayloads.map((payload, index) => ({
			queryKey: [
				REACT_QUERY_KEY.GET_QUERY_RANGE,
				payload,
				ENTITY_VERSION_V5,
				globalSelectedTime,
				maxTime,
				minTime,
				index,
			],
			queryFn: ({
				signal,
			}: {
				signal?: AbortSignal;
			}): Promise<SuccessResponse<MetricRangePayloadProps>> =>
				GetMetricQueryRange(
					{
						query: payload,
						graphType: PANEL_TYPES.BAR,
						selectedTime: 'GLOBAL_TIME',
						globalSelectedInterval: globalSelectedTime,
						params: {
							dataSource: DataSource.METRICS,
						},
					},
					ENTITY_VERSION_V5,
					undefined,
					signal,
				),
			enabled: !!payload,
			retry: (failureCount: number, error: unknown): boolean => {
				if (isAxiosError(error) && error.code === 'ERR_CANCELED') {
					return false;
				}

				let status: number | undefined;

				if (error instanceof APIError) {
					status = error.getHttpStatusCode();
				} else if (isAxiosError(error)) {
					status = error.response?.status;
				}

				if (status && status >= 400 && status < 500) {
					return false;
				}

				return failureCount < MAX_QUERY_RETRIES;
			},
			onError: (error: APIError): void => {
				showErrorModal(error);
			},
		})),
	);

	const isFetching = queries.some((q) => q.isFetching);
	useEffect(() => {
		onFetchingStateChange?.(isFetching);
	}, [isFetching, onFetchingStateChange]);

	const responseData = useMemo(() => {
		const data = queries.map(({ data }) => data) ?? [];
		return data.map((datapoint) =>
			isValidToConvertToMs ? convertDataValueToMs(datapoint) : datapoint,
		);
	}, [queries, isValidToConvertToMs]);

	const isLoading = queries.some((q) => q.isLoading);
	const isError = queries.some((q) => q.isError);

	return {
		responseData,
		isLoading,
		isError,
	};
}
