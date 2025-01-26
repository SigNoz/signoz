/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { getWidgetQuery } from 'pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';

// State Graphs
export const celeryAllStateWidgetData = getWidgetQueryBuilder(
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
					items: [
						{
							id: 'a163d71c',
							key: {
								dataType: DataTypes.String,
								id: 'celery.task_name--string--tag--false',
								isColumn: false,
								isJSON: false,
								key: 'celery.task_name',
								type: 'tag',
							},
							op: '=',
							value: 'tasks.tasks.divide',
						},
					],
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
		title: 'All',
		description:
			'Represents all states of task, including success, failed, and retry.',
		panelTypes: PANEL_TYPES.BAR,
	}),
);

export const celeryRetryStateWidgetData = getWidgetQueryBuilder(
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
							id: '6d97eed3',
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
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'count',
			},
		],
	}),
);

export const celeryFailedStateWidgetData = getWidgetQueryBuilder(
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
							id: '5983eae2',
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
	}),
);

export const celerySuccessStateWidgetData = getWidgetQueryBuilder(
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
							id: '000c5a93',
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
	}),
);

export const celeryTasksByWorkerWidgetData = getWidgetQueryBuilder(
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
				legend: '',
				limit: 10,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'rate',
			},
		],
	}),
);

export const celeryErrorByWorkerWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Error% by worker',
		description: 'Represents the number of errors by each worker.',
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
				legend: '',
				limit: 10,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'rate',
			},
		],
	}),
);

export const celeryLatencyByWorkerWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Latency by Worker',
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
				legend: '',
				limit: 10,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'p99',
			},
		],
		yAxisUnit: 'ns',
	}),
);

export const celeryActiveTasksWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Tasks/ worker (Active tasks)',
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
				legend: '',
				limit: null,
				orderBy: [],
				queryName: 'A',
				reduceTo: 'avg',
				spaceAggregation: 'avg',
				stepInterval: 60,
				timeAggregation: 'latest',
			},
		],
	}),
);

export const celeryWorkerOnlineWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Worker Online',
		description: 'Represents the number of workers online.',
		panelTypes: PANEL_TYPES.VALUE,
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'flower_task_runtime_seconds_sum--float64--Sum--true',
					isColumn: true,
					isJSON: false,
					key: 'flower_task_runtime_seconds_sum',
					type: 'Sum',
				},
				aggregateOperator: 'rate',
				dataSource: DataSource.METRICS,
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
				reduceTo: 'avg',
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'rate',
			},
		],
	}),
);

// Task Latency
export const celeryTaskLatencyWidgetData = (type: string): Widgets =>
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
					legend: '',
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
					stepInterval: 60,
					timeAggregation: 'p99',
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
							id: '9e09c9ed',
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
							id: '2330f906',
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
							id: 'ec3df7b7',
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
