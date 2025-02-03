/* eslint-disable sonarjs/no-duplicate-string */
import { getStepInterval } from 'components/CeleryTask/CeleryTaskGraph/CeleryTaskGraphUtils';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { getWidgetQuery } from 'pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil';
import { Widgets } from 'types/api/dashboard/getAll';
import {
	BaseAutocompleteData,
	DataTypes,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

export const celeryOverviewRequestRateWidgetData = (
	filters?: TagFilterItem[],
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Request Rate',
			description: 'Represents request rate of the service',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.EMPTY,
						id: '------false',
						isColumn: false,
						isJSON: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'rate',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: filters ?? [],
						op: 'AND',
					},
					functions: [],
					groupBy: [],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'rate',
				},
			],
			panelTypes: PANEL_TYPES.VALUE,
		}),
	);

export const celeryOverviewErrorRateWidgetData = (
	filters?: TagFilterItem[],
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Error',
			description: 'Represents Error in the service',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.EMPTY,
						id: '------false',
						isColumn: false,
						isJSON: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'rate',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							...(filters ?? []),
							{
								id: uuidv4(),
								key: {
									dataType: DataTypes.bool,
									id: 'has_error--bool----true',
									isColumn: true,
									isJSON: false,
									key: 'has_error',
									type: '',
								},
								op: '=',
								value: 'true',
							},
						],
						op: 'AND',
					},
					functions: [],
					groupBy: [],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'rate',
				},
			],
			panelTypes: PANEL_TYPES.VALUE,
		}),
	);

export const celeryOverviewAvgLatencyWidgetData = (
	filters?: TagFilterItem[],
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Avg Latency',
			description: 'Represents Avg Latency of the service',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						id: 'duration_nano--float64----true',
						isColumn: true,
						isJSON: false,
						key: 'duration_nano',
						type: '',
					},
					aggregateOperator: 'p95',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: filters ?? [],
						op: 'AND',
					},
					functions: [],
					groupBy: [],
					having: [],
					legend: 'p95',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'p95',
				},
			],
			panelTypes: PANEL_TYPES.VALUE,
		}),
	);

export const celeryOverviewRequestRateGraphData = (
	startTime: number,
	endTime: number,
	filters?: TagFilterItem[],
	groupByFilter?: BaseAutocompleteData,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Request rate',
			description: 'Represents Request rate of the service',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.EMPTY,
						id: '------false',
						isColumn: false,
						isJSON: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'rate',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: filters ?? [],
						op: 'AND',
					},
					functions: [],
					groupBy: groupByFilter ? [groupByFilter] : [],
					having: [],
					legend: 'Request Rate',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'rate',
				},
			],
			panelTypes: PANEL_TYPES.BAR,
			yAxisUnit: 'reqps',
		}),
	);

export const celeryOverviewErrorRateGraphData = (
	startTime: number,
	endTime: number,
	filters?: TagFilterItem[],
	groupByFilter?: BaseAutocompleteData,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Error %',
			description: 'Represents Error in the service',
			queryData: [
				{
					dataSource: DataSource.TRACES,
					queryName: 'A',
					aggregateOperator: 'count_distinct',
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: 'span_id--string----true',
						isColumn: true,
						isJSON: false,
						key: 'span_id',
						type: '',
					},
					timeAggregation: 'count_distinct',
					spaceAggregation: 'sum',
					functions: [],
					filters: {
						items: [
							...(filters ?? []),
							{
								id: uuidv4(),
								key: {
									dataType: DataTypes.bool,
									id: 'has_error--bool----true',
									isColumn: true,
									isJSON: false,
									key: 'has_error',
									type: '',
								},
								op: '=',
								value: 'true',
							},
						],
						op: 'AND',
					},
					expression: 'A',
					disabled: true,
					stepInterval: getStepInterval(startTime, endTime),
					having: [],
					limit: null,
					orderBy: [],
					groupBy: groupByFilter ? [groupByFilter] : [],
					legend: '',
					reduceTo: 'avg',
				},
				{
					dataSource: DataSource.TRACES,
					queryName: 'B',
					aggregateOperator: 'count_distinct',
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: 'span_id--string----true',
						isColumn: true,
						isJSON: false,
						key: 'span_id',
						type: '',
					},
					timeAggregation: 'count_distinct',
					spaceAggregation: 'sum',
					functions: [],
					filters: {
						items: [
							...(filters ?? []),
							{
								id: uuidv4(),
								key: {
									dataType: DataTypes.bool,
									id: 'has_error--bool----true',
									isColumn: true,
									isJSON: false,
									key: 'has_error',
									type: '',
								},
								op: '=',
								value: 'false',
							},
						],
						op: 'AND',
					},
					expression: 'B',
					disabled: true,
					stepInterval: getStepInterval(startTime, endTime),
					having: [],
					limit: null,
					orderBy: [],
					groupBy: groupByFilter ? [groupByFilter] : [],
					legend: '',
					reduceTo: 'avg',
				},
				{
					dataSource: DataSource.TRACES,
					queryName: 'C',
					aggregateOperator: 'count_distinct',
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: 'span_id--string----true',
						isColumn: true,
						isJSON: false,
						key: 'span_id',
						type: '',
					},
					timeAggregation: 'count_distinct',
					spaceAggregation: 'sum',
					functions: [],
					filters: {
						items: filters ?? [],
						op: 'AND',
					},
					expression: 'C',
					disabled: true,
					stepInterval: getStepInterval(startTime, endTime),
					having: [],
					limit: null,
					orderBy: [],
					groupBy: groupByFilter ? [groupByFilter] : [],
					legend: '',
					reduceTo: 'avg',
				},
				{
					queryName: 'F1',
					expression: '(A/C)*100',
					disabled: false,
					legend: 'True',
				} as any,
				{
					queryName: 'F2',
					expression: '(B/C)*100',
					disabled: false,
					legend: 'False',
				} as any,
			],
			panelTypes: PANEL_TYPES.BAR,
			yAxisUnit: 'percent',
		}),
	);

export const celeryOverviewAvgLatencyGraphData = (
	startTime: number,
	endTime: number,
	filters?: TagFilterItem[],
	groupByFilter?: BaseAutocompleteData,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Latency',
			description: 'Represents Latency of the service',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.ArrayFloat64,
						id: 'duration_nano--float64----true',
						isColumn: true,
						isJSON: false,
						key: 'duration_nano',
						type: '',
					},
					aggregateOperator: 'p90',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'C',
					filters: {
						items: filters ?? [],
						op: 'AND',
					},
					functions: [],
					groupBy: groupByFilter ? [groupByFilter] : [],
					having: [],
					legend: 'p90',
					limit: null,
					orderBy: [],
					queryName: 'C',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'p90',
				},
				{
					aggregateAttribute: {
						dataType: DataTypes.ArrayFloat64,
						id: 'duration_nano--float64----true',
						isColumn: true,
						isJSON: false,
						key: 'duration_nano',
						type: '',
					},
					aggregateOperator: 'p95',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'D',
					filters: {
						items: filters ?? [],
						op: 'AND',
					},
					functions: [],
					groupBy: groupByFilter ? [groupByFilter] : [],
					having: [],
					legend: 'p95',
					limit: null,
					orderBy: [],
					queryName: 'D',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'p95',
				},
				{
					aggregateAttribute: {
						dataType: DataTypes.ArrayFloat64,
						id: 'duration_nano--float64----true',
						isColumn: true,
						isJSON: false,
						key: 'duration_nano',
						type: '',
					},
					aggregateOperator: 'p99',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'E',
					filters: {
						items: filters ?? [],
						op: 'AND',
					},
					functions: [],
					groupBy: groupByFilter ? [groupByFilter] : [],
					having: [],
					legend: 'p99',
					limit: null,
					orderBy: [],
					queryName: 'E',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'p99',
				},
			],
			panelTypes: PANEL_TYPES.TIME_SERIES,
			yAxisUnit: 'ns',
		}),
	);
