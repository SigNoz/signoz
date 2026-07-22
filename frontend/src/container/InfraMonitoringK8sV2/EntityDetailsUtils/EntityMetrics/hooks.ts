import { useMemo } from 'react';
import { QueryFunctionContext, useQueries, UseQueryResult } from 'react-query';
import { ENTITY_VERSION_V5 } from 'constants/app';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { InfraMonitoringEntity } from 'container/InfraMonitoringK8sV2/constants';
import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import { prepareChartData } from 'lib/uPlotV2/utils/dataUtils';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import uPlot from 'uplot';

import { FeatureKeys } from 'constants/features';
import { useAppContext } from 'providers/App/App';
import { getMetricsTableData, MetricsTableData } from './utils';

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
	chartData: (uPlot.AlignedData | null)[];
	tableData: (MetricsTableData[] | null)[];
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
			// TODO: remove AUTO_REFRESH_QUERY when migrating to date time selection v3
			queryKey: [
				REACT_QUERY_KEY.AUTO_REFRESH_QUERY,
				queryKey,
				payload,
				ENTITY_VERSION_V5,
				category,
			],
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
				if (panelType === PANEL_TYPES.TABLE) {
					return null;
				}
				return data?.payload ? prepareChartData(data.payload) : null;
			}),
		[queries, queryPayloads],
	);

	const tableData = useMemo(
		() =>
			queries.map(({ data }, index) => {
				const panelType = queryPayloads[index]?.graphType;
				if (panelType !== PANEL_TYPES.TABLE) {
					return null;
				}
				return getMetricsTableData(data);
			}),
		[queries, queryPayloads],
	);

	return {
		queries,
		chartData,
		tableData,
		queryPayloads,
	};
}
