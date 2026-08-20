import { InframonitoringtypesContainerRecordDTO } from 'api/generated/services/sigNoz.schemas';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import { INFRA_MONITORING_ATTR_KEYS } from '../constants';
import { getContainerName, getContainerPodUID } from './utils';

const QUERY_NAMES = ['A', 'B', 'C', 'D', 'E', 'F'];
const STEP_INTERVAL = 60;

type TimeAggregation = 'avg' | 'max' | 'min';
type SpaceAggregation = 'sum' | 'avg' | 'max';

interface SeriesSpec {
	metricKey: string;
	legend: string;
	timeAggregation: TimeAggregation;
	spaceAggregation: SpaceAggregation;
}

interface FormulaSpec {
	expression: string;
	legend: string;
}

/**
 * Every panel is scoped to a single container by the (k8s.pod.uid,
 * k8s.container.name) pair that identifies its row in the list.
 */
function buildScopeFilters(
	container: InframonitoringtypesContainerRecordDTO,
): TagFilter {
	return {
		items: [
			{
				id: 'pod-uid',
				key: {
					dataType: DataTypes.String,
					id: `k8s_pod_uid--string--tag--false`,
					key: INFRA_MONITORING_ATTR_KEYS.K8S_POD_UID,
					type: 'tag',
				},
				op: '=',
				value: getContainerPodUID(container),
			},
			{
				id: 'container-name',
				key: {
					dataType: DataTypes.String,
					id: `k8s_container_name--string--tag--false`,
					key: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_NAME,
					type: 'tag',
				},
				op: '=',
				value: getContainerName(container),
			},
		],
		op: 'AND',
	};
}

function buildQuery(
	container: InframonitoringtypesContainerRecordDTO,
	start: number,
	end: number,
	series: SeriesSpec[],
	formulas: FormulaSpec[] = [],
): GetQueryResultsProps {
	const filters = buildScopeFilters(container);

	return {
		selectedTime: 'GLOBAL_TIME',
		graphType: PANEL_TYPES.TIME_SERIES,
		query: {
			builder: {
				queryData: series.map((spec, index) => ({
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						id: `${spec.metricKey.replace(/\./g, '_')}--float64--Gauge--true`,
						key: spec.metricKey,
						type: 'Gauge',
					},
					aggregateOperator: spec.timeAggregation,
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: QUERY_NAMES[index],
					filters,
					functions: [],
					groupBy: [],
					having: [],
					legend: spec.legend,
					limit: null,
					orderBy: [],
					queryName: QUERY_NAMES[index],
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: spec.spaceAggregation,
					stepInterval: STEP_INTERVAL,
					timeAggregation: spec.timeAggregation,
				})),
				queryFormulas: formulas.map((formula, index) => ({
					disabled: false,
					expression: formula.expression,
					legend: formula.legend,
					queryName: `F${index + 1}`,
				})),
				queryTraceOperator: [],
			},
			clickhouse_sql: [{ disabled: false, legend: '', name: 'A', query: '' }],
			id: v4(),
			promql: [{ disabled: false, legend: '', name: 'A', query: '' }],
			queryType: EQueryType.QUERY_BUILDER,
		},
		variables: {},
		formatForWeb: false,
		start,
		end,
	};
}

/** Absolute usage metrics are summed across series, ratios are averaged. */
function usageSeries(metricKey: string, legendPrefix = ''): SeriesSpec[] {
	const prefix = legendPrefix ? `${legendPrefix} - ` : '';
	return [
		{
			metricKey,
			legend: `${prefix}Avg`,
			timeAggregation: 'avg',
			spaceAggregation: 'sum',
		},
		{
			metricKey,
			legend: `${prefix}Max`,
			timeAggregation: 'max',
			spaceAggregation: 'sum',
		},
		{
			metricKey,
			legend: `${prefix}Min`,
			timeAggregation: 'min',
			spaceAggregation: 'sum',
		},
	];
}

function utilizationSeries(
	metricKey: string,
	legendPrefix: string,
): SeriesSpec[] {
	return (['avg', 'max', 'min'] as TimeAggregation[]).map((timeAggregation) => ({
		metricKey,
		legend: `${legendPrefix} - ${
			timeAggregation.charAt(0).toUpperCase() + timeAggregation.slice(1)
		}`,
		timeAggregation,
		spaceAggregation: 'avg' as const,
	}));
}

export const getContainerMetricsQueryPayload = (
	container: InframonitoringtypesContainerRecordDTO,
	start: number,
	end: number,
): GetQueryResultsProps[] => {
	const query = (
		series: SeriesSpec[],
		formulas?: FormulaSpec[],
	): GetQueryResultsProps => buildQuery(container, start, end, series, formulas);

	return [
		query(usageSeries(INFRA_MONITORING_ATTR_KEYS.CONTAINER_CPU_USAGE)),
		query([
			...utilizationSeries(
				INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_CPU_REQUEST_UTILIZATION,
				'Request util %',
			),
			...utilizationSeries(
				INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_CPU_LIMIT_UTILIZATION,
				'Limit util %',
			),
		]),
		query([
			...usageSeries(INFRA_MONITORING_ATTR_KEYS.CONTAINER_MEMORY_USAGE, 'Usage'),
			{
				metricKey: INFRA_MONITORING_ATTR_KEYS.CONTAINER_MEMORY_AVAILABLE,
				legend: 'Available',
				timeAggregation: 'avg',
				spaceAggregation: 'sum',
			},
		]),
		query([
			...utilizationSeries(
				INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_MEMORY_REQUEST_UTILIZATION,
				'Request util %',
			),
			...utilizationSeries(
				INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION,
				'Limit util %',
			),
		]),
		query(
			[
				{
					metricKey: INFRA_MONITORING_ATTR_KEYS.CONTAINER_MEMORY_RSS,
					legend: 'RSS Memory',
					timeAggregation: 'avg',
					spaceAggregation: 'sum',
				},
				{
					metricKey: INFRA_MONITORING_ATTR_KEYS.CONTAINER_MEMORY_WORKING_SET,
					legend: 'Working Set Memory',
					timeAggregation: 'avg',
					spaceAggregation: 'sum',
				},
			],
			[{ expression: 'B - A', legend: 'Cache Memory' }],
		),
		query([
			{
				metricKey: INFRA_MONITORING_ATTR_KEYS.CONTAINER_MEMORY_MAJOR_PAGE_FAULTS,
				legend: 'Major Page Faults',
				timeAggregation: 'avg',
				spaceAggregation: 'sum',
			},
		]),
		query([
			{
				metricKey: INFRA_MONITORING_ATTR_KEYS.CONTAINER_FILESYSTEM_CAPACITY,
				legend: 'Capacity',
				timeAggregation: 'avg',
				spaceAggregation: 'sum',
			},
			{
				metricKey: INFRA_MONITORING_ATTR_KEYS.CONTAINER_FILESYSTEM_AVAILABLE,
				legend: 'Available',
				timeAggregation: 'avg',
				spaceAggregation: 'sum',
			},
			{
				metricKey: INFRA_MONITORING_ATTR_KEYS.CONTAINER_FILESYSTEM_USAGE,
				legend: 'Usage',
				timeAggregation: 'avg',
				spaceAggregation: 'sum',
			},
		]),
		query([
			{
				metricKey: INFRA_MONITORING_ATTR_KEYS.CONTAINER_UPTIME,
				legend: 'Uptime',
				timeAggregation: 'max',
				spaceAggregation: 'max',
			},
		]),
		query([
			{
				metricKey: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_CPU_NODE_UTILIZATION,
				legend: 'Node CPU Utilization',
				timeAggregation: 'avg',
				spaceAggregation: 'avg',
			},
		]),
		query([
			{
				metricKey: INFRA_MONITORING_ATTR_KEYS.K8S_CONTAINER_MEMORY_NODE_UTILIZATION,
				legend: 'Node Memory Utilization',
				timeAggregation: 'avg',
				spaceAggregation: 'avg',
			},
		]),
	];
};
