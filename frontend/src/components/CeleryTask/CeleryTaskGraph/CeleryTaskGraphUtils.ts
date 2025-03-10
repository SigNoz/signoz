/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { getWidgetQuery } from 'pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

// dynamic step interval
export const getStepInterval = (startTime: number, endTime: number): number => {
	const diffInMinutes = (endTime - startTime) / 1000000 / (60 * 1000); // Convert to minutes

	if (diffInMinutes <= 15) return 60; // 15 min or less
	if (diffInMinutes <= 30) return 60; // 30 min or less
	if (diffInMinutes <= 60) return 120; // 1 hour or less
	if (diffInMinutes <= 360) return 520; // 6 hours or less
	if (diffInMinutes <= 1440) return 2440; // 1 day or less
	if (diffInMinutes <= 10080) return 10080; // 1 week or less
	return 54000; // More than a week (use monthly interval)
};

// State Graphs
export const celeryAllStateWidgetData = (
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: '------false',
						isColumn: false,
						isJSON: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'count',
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
							id: 'celery.state--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'celery.state',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.state}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'rate',
				},
			],
			title: 'All',
			description:
				'Represents all states of task, including success, failed, and retry.',
			panelTypes: PANEL_TYPES.BAR,
		}),
	);

export const celeryRetryStateWidgetData = (
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Retry',
			description: 'Represents the number of retry tasks.',
			panelTypes: PANEL_TYPES.BAR,
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: '------false',
						isColumn: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'count',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							{
								id: uuidv4(),
								key: {
									dataType: DataTypes.String,
									id: 'celery.state--string--tag--false',
									isColumn: false,
									isJSON: false,
									key: 'celery.state',
									type: 'tag',
								},
								op: '=',
								value: 'RETRY',
							},
						],
						op: 'AND',
					},
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'celery.hostname--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'count',
				},
			],
		}),
	);

export const celeryFailedStateWidgetData = (
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Failed',
			description: 'Represents the number of failed tasks.',
			panelTypes: PANEL_TYPES.BAR,
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: '------false',
						isColumn: false,
						isJSON: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'count',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							{
								id: uuidv4(),
								key: {
									dataType: DataTypes.String,
									id: 'celery.state--string--tag--false',
									isColumn: false,
									isJSON: false,
									key: 'celery.state',
									type: 'tag',
								},
								op: '=',
								value: 'FAILURE',
							},
						],
						op: 'AND',
					},
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'celery.hostname--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'rate',
				},
			],
		}),
	);

export const celerySuccessStateWidgetData = (
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Success',
			description: 'Represents the number of successful tasks.',
			panelTypes: PANEL_TYPES.BAR,
			queryData: [
				{
					aggregateAttribute: {
						dataType: DataTypes.String,
						id: '------false',
						isColumn: false,
						isJSON: false,
						key: '',
						type: '',
					},
					aggregateOperator: 'count',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							{
								id: uuidv4(),
								key: {
									dataType: DataTypes.String,
									id: 'celery.state--string--tag--false',
									isColumn: false,
									isJSON: false,
									key: 'celery.state',
									type: 'tag',
								},
								op: '=',
								value: 'SUCCESS',
							},
						],
						op: 'AND',
					},
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'celery.hostname--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'rate',
				},
			],
		}),
	);

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
						isColumn: false,
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
							isColumn: false,
							isJSON: false,
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: 10,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
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
					groupBy: [
						{
							dataType: DataTypes.String,
							isColumn: false,
							isJSON: false,
							key: 'celery.hostname',
							type: 'tag',
							id: 'celery.hostname--string--tag--false',
						},
					],
					legend: '',
					reduceTo: 'avg',
				},
				{
					dataSource: 'traces',
					queryName: 'B',
					aggregateOperator: 'count_distinct',
					aggregateAttribute: {
						dataType: 'string',
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
							isColumn: false,
							isJSON: false,
							key: 'celery.hostname',
							type: 'tag',
							id: 'celery.hostname--string--tag--false',
						},
					],
					legend: '',
					reduceTo: 'avg',
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
						isColumn: true,
						isJSON: false,
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
							isColumn: false,
							isJSON: false,
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: 10,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
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
						isColumn: true,
						isJSON: false,
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
							isColumn: false,
							isJSON: false,
							key: 'worker',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{worker}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'avg',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'latest',
				},
			],
			yAxisUnit: 'cps',
		}),
	);

export const celeryTaskLatencyWidgetData = (
	type: string,
	startTime: number,
	endTime: number,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: 'Task Latency',
			description: 'Represents the latency of task execution.',
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
					aggregateOperator: type || 'p99',
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
							id: 'celery.task_name--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'celery.task_name',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.task_name}}',
					limit: null,
					orderBy: [
						{
							columnName: '#SIGNOZ_VALUE',
							order: 'asc',
						},
					],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: type || 'p99',
				},
			],
			yAxisUnit: 'ns',
		}),
	);

// Tables
export const celerySlowestTasksTableWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Slowest Tasks',
		description: 'Represents the slowest tasks.',
		panelTypes: PANEL_TYPES.TABLE,
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
				aggregateOperator: 'avg',
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
						id: 'celery.task_name--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'celery.task_name',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: 10,
				orderBy: [
					{
						columnName: '#SIGNOZ_VALUE',
						order: 'desc',
					},
				],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		columnUnits: { A: 'ns' },
	}),
);

export const celeryRetryTasksTableWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Top 10 tasks in retry state',
		description: 'Represents the top 10 tasks in retry state.',
		panelTypes: PANEL_TYPES.TABLE,
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
				aggregateOperator: 'avg',
				dataSource: DataSource.TRACES,
				disabled: false,
				expression: 'A',
				filters: {
					items: [
						{
							id: uuidv4(),
							key: {
								dataType: DataTypes.String,
								id: 'celery.state--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'celery.state',
								type: 'tag',
							},
							op: '=',
							value: 'RETRY',
						},
					],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'celery.task_name--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'celery.task_name',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: 10,
				orderBy: [
					{
						columnName: '#SIGNOZ_VALUE',
						order: 'desc',
					},
				],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		columnUnits: { A: 'ns' },
	}),
);

export const celeryFailedTasksTableWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Top 10 tasks in FAILED state',
		description: 'Represents the top 10 tasks in failed state.',
		panelTypes: PANEL_TYPES.TABLE,
		columnUnits: { A: 'ns' },
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
				aggregateOperator: 'avg',
				dataSource: DataSource.TRACES,
				disabled: false,
				expression: 'A',
				filters: {
					items: [
						{
							id: uuidv4(),
							key: {
								dataType: DataTypes.String,
								id: 'celery.state--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'celery.state',
								type: 'tag',
							},
							op: '=',
							value: 'FAILURE',
						},
					],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'celery.task_name--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'celery.task_name',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [
					{
						columnName: '#SIGNOZ_VALUE',
						order: 'desc',
					},
				],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
	}),
);

export const celerySuccessTasksTableWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Top 10 tasks in SUCCESS state',
		description: 'Represents the top 10 tasks in success state.',
		panelTypes: PANEL_TYPES.TABLE,
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
				aggregateOperator: 'avg',
				dataSource: DataSource.TRACES,
				disabled: false,
				expression: 'A',
				filters: {
					items: [
						{
							id: uuidv4(),
							key: {
								dataType: DataTypes.String,
								id: 'celery.state--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'celery.state',
								type: 'tag',
							},
							op: '=',
							value: 'SUCCESS',
						},
					],
					op: 'AND',
				},
				functions: [],
				groupBy: [
					{
						dataType: DataTypes.String,
						id: 'celery.task_name--string--tag--false',
						isColumn: false,
						isJSON: false,
						key: 'celery.task_name',
						type: 'tag',
					},
				],
				having: [],
				legend: '',
				limit: null,
				orderBy: [
					{
						columnName: '#SIGNOZ_VALUE',
						order: 'desc',
					},
				],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
		columnUnits: { A: 'ns' },
	}),
);

export const celeryTimeSeriesTablesWidgetData = (
	entity: string,
	value: string | number,
	rightPanelTitle: string,
): Widgets =>
	getWidgetQueryBuilder(
		getWidgetQuery({
			title: rightPanelTitle,
			description: '',
			panelTypes: PANEL_TYPES.TABLE,
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
					aggregateOperator: 'avg',
					dataSource: DataSource.TRACES,
					disabled: false,
					expression: 'A',
					filters: {
						items: [
							{
								id: uuidv4(),
								key: {
									dataType: DataTypes.String,
									id: `${entity}--string--tag--false`,
									isColumn: false,
									isJSON: false,
									key: `${entity}`,
									type: 'tag',
								},
								op: '=',
								value,
							},
						],
						op: 'AND',
					},
					functions: [],
					groupBy: [
						{
							dataType: DataTypes.String,
							id: 'celery.task_name--string--tag--false',
							isColumn: false,
							isJSON: false,
							key: 'celery.task_name',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: 'avg',
					spaceAggregation: 'sum',
					stepInterval: 60,
					timeAggregation: 'avg',
				},
			],
			columnUnits: { A: 'ns' },
		}),
	);

// State Count Widget
export const celeryAllStateCountWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'All State Count',
		description: 'Represents the all state count.',
		panelTypes: PANEL_TYPES.VALUE,
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.String,
					id: 'span_id--string----true',
					isColumn: true,
					isJSON: false,
					key: 'span_id',
					type: '',
				},
				aggregateOperator: 'count_distinct',
				dataSource: DataSource.TRACES,
				disabled: false,
				expression: 'A',
				filters: {
					items: [],
					op: 'AND',
				},
				functions: [],
				groupBy: [],
				having: [],
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'last',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'count_distinct',
			},
		],
	}),
);

export const celerySuccessStateCountWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Successful State Count',
		description: 'Represents the successful state count.',
		panelTypes: PANEL_TYPES.VALUE,
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.String,
					id: 'span_id--string----true',
					isColumn: true,
					isJSON: false,
					key: 'span_id',
					type: '',
				},
				aggregateOperator: 'count_distinct',
				dataSource: DataSource.TRACES,
				disabled: false,
				expression: 'A',
				filters: {
					items: [
						{
							id: uuidv4(),
							key: {
								dataType: DataTypes.String,
								id: 'celery.state--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'celery.state',
								type: 'tag',
							},
							op: '=',
							value: 'SUCCESS',
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
				reduceTo: 'last',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'count_distinct',
			},
		],
	}),
);

export const celeryFailedStateCountWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Failed State Count',
		description: 'Represents the failed state count.',
		panelTypes: PANEL_TYPES.VALUE,
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.String,
					id: 'span_id--string----true',
					isColumn: true,
					isJSON: false,
					key: 'span_id',
					type: '',
				},
				aggregateOperator: 'count_distinct',
				dataSource: DataSource.TRACES,
				disabled: false,
				expression: 'A',
				filters: {
					items: [
						{
							id: uuidv4(),
							key: {
								dataType: DataTypes.String,
								id: 'celery.state--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'celery.state',
								type: 'tag',
							},
							op: '=',
							value: 'FAILURE',
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
				reduceTo: 'last',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'count_distinct',
			},
		],
	}),
);

export const celeryRetryStateCountWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Retry State Count',
		description: 'Represents the retry state count.',
		panelTypes: PANEL_TYPES.VALUE,
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.String,
					id: 'span_id--string----true',
					isColumn: true,
					key: 'span_id',
					type: '',
				},
				aggregateOperator: 'count_distinct',
				dataSource: DataSource.TRACES,
				disabled: false,
				expression: 'A',
				filters: {
					items: [
						{
							id: uuidv4(),
							key: {
								dataType: DataTypes.String,
								id: 'celery.state--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'celery.state',
								type: 'tag',
							},
							op: '=',
							value: 'RETRY',
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
				reduceTo: 'last',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'count_distinct',
			},
		],
	}),
);
