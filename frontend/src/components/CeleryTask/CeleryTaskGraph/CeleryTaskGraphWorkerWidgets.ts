import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { getWidgetQuery } from 'pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

import { getStepInterval } from './CeleryTaskGraphTimeUtils';

export const celeryTasksByWorkerWidgetData = (
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Tasks/s by worker',
			description: 'Represents the number of tasks executed by each worker.',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: '------false',
						key: '',
						type: '',
					},
					aggregateOperator: 'rate',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [],
						op: 'AND',
					},
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'celery.hostname--string--tag--false',
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: 10,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'rate',
				},
			],
			yAxisUnit: 'cps',
		}),
	);

export const celeryErrorByWorkerWidgetData = (
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Error% by worker',
			description: 'Represents the number of errors by each worker.',
			queryData: [
				{
					dataSource: DataSource.TRACES,
					queryName: 'A',
					aggregateOperator: 'count_distinct',
					aggregateAttribute: {
						dataType: 'string',
						id: 'span_id--string----true',
						key: 'span_id',
						type: '',
					},
					timeAggregation: 'count_distinct',
					spaceAggregation: 'sum',
					functions: [],
					filters: {
						items: [
							{
								id: uuidv4(),
								key: {
									dataType: DataTypes.bool,
									id: 'has_error--bool----true',
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
					groupBy: [
						{
							dataType: DataTypes.String,
							key: 'celery.hostname',
							type: 'tag',
							id: 'celery.hostname--string--tag--false',
						},
					],
					legend: '',
					reduceTo: ReduceOperators.AVG,
				},
				{
					dataSource: 'traces',
					queryName: 'B',
					aggregateOperator: 'count_distinct',
					aggregateAttribute: {
						dataType: 'string',
						id: 'span_id--string----true',
						key: 'span_id',
						type: '',
					},
					timeAggregation: 'count_distinct',
					spaceAggregation: 'sum',
					functions: [],
					filters: {
						items: [],
						op: 'AND',
					},
					expression: 'B',
					disabled: true,
					stepInterval: getStepInterval(startTime, endTime),
					having: [],
					limit: null,
					orderBy: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							key: 'celery.hostname',
							type: 'tag',
							id: 'celery.hostname--string--tag--false',
						},
					],
					legend: '',
					reduceTo: ReduceOperators.AVG,
				},
				{
					queryName: 'F1',
					expression: '(A/B)*100',
					disabled: false,
					legend: '{{celery.hostname}}',
				} as any,
			],
			yAxisUnit: 'percent',
		}),
	);

export const celeryLatencyByWorkerWidgetData = (
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Latency by worker',
			description: 'Represents the latency of tasks by each worker.',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						id: 'duration_nano--float64----true',
						key: 'duration_nano',
						type: '',
					},
					aggregateOperator: 'p99',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [],
						op: 'AND',
					},
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'celery.hostname--string--tag--false',
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: 10,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'p99',
				},
			],
			yAxisUnit: 'ns',
		}),
	);

export const celeryActiveTasksWidgetData = (
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Active Tasks by worker',
			description: 'Represents the number of active tasks.',
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.Float64,
						id:
							'flower_worker_number_of_currently_executing_tasks--float64--Gauge--true',
						key: 'flower_worker_number_of_currently_executing_tasks',
						type: 'Gauge',
					},
					aggregateOperator: 'latest',
					dataSource: DataSource.METRICS,
					disabled: false,
					expression: 'A',
					filters: {
						items: [],
						op: 'AND',
					},
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'worker--string--tag--false',
							key: 'worker',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{worker}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'avg',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'latest',
				},
			],
			yAxisUnit: 'cps',
		}),
	);

