import { useMemo } from 'react';
import { QueryFunctionContext, useQueries, UseQueryResult } from 'react-query';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8s/constants';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import { getUPlotChartData } from 'lib/uPlotLib/utils/getUplotChartData';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

import { FeatureKeys } from '../../../../constants/features';
import { useAppContext } from '../../../../providers/App/App';
import { getMetricsTableData } from './utils';

export interface UseEntityMetricsParams<T> {
	queryKey: string;
	timeRange: { startTime: number; endTime: number };
	entity: T;
	getEntityQueryPayload: (
		entity: T,
		start: number,
		end: number,
		dotMetricsEnabled: boolean,
	) => GetQueryResultsProps[];
	visibilities: boolean[];
	category: InfraMonitoringEntity;
}

export interface UseEntityMetricsResult {
	queries: UseQueryResult<SuccessResponse<MetricRangePayloadProps>, unknown>[];
	chartData: (
		| ReturnType<typeof getUPlotChartData>
		| ReturnType<typeof getMetricsTableData>
	)[];
	queryPayloads: GetQueryResultsProps[];
}

export function useEntityMetrics<T>({
	queryKey,
	timeRange,
	entity,
	getEntityQueryPayload,
	visibilities,
	category,
}: UseEntityMetricsParams<T>): UseEntityMetricsResult {
	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const queryPayloads = useMemo(
		() =>
			getEntityQueryPayload(
				entity,
				timeRange.startTime,
				timeRange.endTime,
				dotMetricsEnabled,
			),
		[
			getEntityQueryPayload,
			entity,
			timeRange.startTime,
			timeRange.endTime,
			dotMetricsEnabled,
		],
	);

	const queries = useQueries(
		queryPayloads.map((payload, index) => ({
			queryKey: [queryKey, payload, ENTITY_VERSION_V5, category],
			queryFn: ({
				signal,
			}: QueryFunctionContext): Promise<
				SuccessResponse<MetricRangePayloadProps>
			> => GetMetricQueryRange(payload, ENTITY_VERSION_V5, undefined, signal),
			enabled: !!payload && visibilities[index],
			keepPreviousData: true,
		})),
	);

	const chartData = useMemo(
		() =>
			queries.map(({ data }, index) => {
				const panelType = queryPayloads[index]?.graphType;
				return panelType === PANEL_TYPES.TABLE
					? getMetricsTableData(data)
					: getUPlotChartData(data?.payload);
			}),
		[queries, queryPayloads],
	);

	return {
		queries,
		chartData,
		queryPayloads,
	};
}
