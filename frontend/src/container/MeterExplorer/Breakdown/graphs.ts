import { PANEL_TYPES } from 'constants/queryBuilder';
import { GetWidgetQueryBuilderProps } from 'container/MetricsApplication/types';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import {
	IBuilderFormula,
	IBuilderQuery,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuid } from 'uuid';

interface GetWidgetQueryProps {
	title: string;
	description: string;
	queryData: IBuilderQuery[];
	queryFormulas?: IBuilderFormula[];
	panelTypes?: PANEL_TYPES;
	yAxisUnit?: string;
	columnUnits?: Record<string, string>;
}

interface GetWidgetQueryPropsReturn extends GetWidgetQueryBuilderProps {
	description?: string;
	nullZeroValues: string;
	columnUnits?: Record<string, string>;
}

export const getWidgetQueryBuilder = ({
	query,
	title = '',
	panelTypes,
	yAxisUnit = '',
	fillSpans = false,
	id,
	nullZeroValues,
	description,
}: GetWidgetQueryPropsReturn): Widgets => ({
	description: description || '',
	id: id || uuid(),
	nullZeroValues: nullZeroValues || '',
	opacity: '1',
	panelTypes,
	query,
	timePreferance: 'GLOBAL_TIME',
	title,
	yAxisUnit,
	softMax: null,
	softMin: null,
	selectedLogFields: [],
	selectedTracesFields: [],
	fillSpans,
});

export function getWidgetQuery(
	props: GetWidgetQueryProps,
): GetWidgetQueryPropsReturn {
	const { title, description, panelTypes, yAxisUnit, columnUnits } = props;
	return {
		title,
		yAxisUnit: yAxisUnit || 'none',
		panelTypes: panelTypes || PANEL_TYPES.TIME_SERIES,
		fillSpans: false,
		description,
		nullZeroValues: 'zero',
		columnUnits,
		query: {
			queryType: EQueryType.QUERY_BUILDER,
			promql: [],
			builder: {
				queryData: props.queryData,
				queryFormulas: (props.queryFormulas as IBuilderFormula[]) || [],
				queryTraceOperator: [],
			},
			clickhouse_sql: [],
			id: uuid(),
		},
	};
}
export const getTotalLogSizeWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'signoz.meter.log.size',
						id: 'signoz.meter.log.size--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'increase',
					dataSource: DataSource.METRICS,
					source: 'meter',
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'count',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'sum',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'increase',
				},
			],
			title: 'Total size of log records ingested',
			description: '',
			panelTypes: PANEL_TYPES.VALUE,
			yAxisUnit: 'bytes',
		}),
	);

export const getTotalTraceSizeWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'signoz.meter.span.size',
						id: 'signoz.meter.span.size--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'increase',
					dataSource: DataSource.METRICS,
					source: 'meter',
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'count',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'sum',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'increase',
				},
			],
			title: 'Total size of spans ingested',
			description: '',
			panelTypes: PANEL_TYPES.VALUE,
			yAxisUnit: 'bytes',
		}),
	);

export const getTotalMetricDatapointCountWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'signoz.meter.metric.datapoint.count',
						id: 'signoz.meter.metric.datapoint.count--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'increase',
					dataSource: DataSource.METRICS,
					source: 'meter',
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'count',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'sum',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'increase',
				},
			],
			title: 'Total metric datapoints ingested',
			description: '',
			panelTypes: PANEL_TYPES.VALUE,
			yAxisUnit: 'short',
		}),
	);

export const getLogCountWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'signoz.meter.log.count',
						id: 'signoz.meter.log.count--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'increase',
					dataSource: DataSource.METRICS,
					source: 'meter',
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'count',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'increase',
				},
			],
			title: 'Count of log records ingested',
			description: '',
			panelTypes: PANEL_TYPES.BAR,
			yAxisUnit: 'short',
		}),
	);

export const getLogSizeWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'signoz.meter.log.size',
						id: 'signoz.meter.log.size--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'increase',
					dataSource: DataSource.METRICS,
					source: 'meter',
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'size',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'increase',
				},
			],
			title: 'Size of log records ingested',
			description: '',
			panelTypes: PANEL_TYPES.BAR,
			yAxisUnit: 'bytes',
		}),
	);

export const getSpanCountWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'signoz.meter.span.count',
						id: 'signoz.meter.span.count--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'increase',
					dataSource: DataSource.METRICS,
					source: 'meter',
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'count',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'increase',
				},
			],
			title: 'Count of spans ingested',
			description: '',
			panelTypes: PANEL_TYPES.BAR,
			yAxisUnit: 'short',
		}),
	);

export const getSpanSizeWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'signoz.meter.span.size',
						id: 'signoz.meter.span.size--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'increase',
					dataSource: DataSource.METRICS,
					source: 'meter',
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'size',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'increase',
				},
			],
			title: 'Size of spans ingested',
			description: '',
			panelTypes: PANEL_TYPES.BAR,
			yAxisUnit: 'bytes',
		}),
	);

export const getMetricCountWidgetData = (): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						key: 'signoz.meter.metric.datapoint.count',
						id: 'signoz.meter.metric.datapoint.count--float64--Sum--true',
						type: 'Sum',
					},
					aggregateOperator: 'increase',
					dataSource: DataSource.METRICS,
					source: 'meter',
					disabled: false,
					expression: 'A',
					filters: { items: [], op: 'AND' },
					functions: [],
					groupBy: [],
					having: [],
					legend: 'count',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'increase',
				},
			],
			title: 'Count of metric datapoints ingested',
			description: '',
			panelTypes: PANEL_TYPES.BAR,
			yAxisUnit: 'short',
		}),
	);
