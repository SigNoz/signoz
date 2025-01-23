/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
// import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';
import { getWidgetQuery } from 'pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
// import { EQueryType } from 'types/common/dashboard';
import { DataSource } from 'types/common/queryBuilder';
// import { v4 as uuidv4 } from 'uuid';

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
		panelTypes: PANEL_TYPES.HISTOGRAM,
	}),
);

export const celeryRetryStateWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Retry',
		description: 'Represents the number of retry tasks.',
		panelTypes: PANEL_TYPES.HISTOGRAM,
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
		panelTypes: PANEL_TYPES.HISTOGRAM,
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
		panelTypes: PANEL_TYPES.HISTOGRAM,
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

export const celeryTaskLatencyWidgetData = getWidgetQueryBuilder(
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
		queryData: [
			{
				aggregateAttribute: {
					dataType: DataTypes.Float64,
					id: 'flower_worker_online--float64--Gauge--true',
					isColumn: true,
					isJSON: false,
					key: 'flower_worker_online',
					type: 'Gauge',
				},
				aggregateOperator: 'avg',
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
				spaceAggregation: 'max',
				stepInterval: 60,
				timeAggregation: 'avg',
			},
		],
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
	}),
);

export const celeryFailedTasksTableWidgetData = getWidgetQueryBuilder(
	getWidgetQuery({
		title: 'Top 10 tasks in FAILED state',
		description: 'Represents the top 10 tasks in failed state.',
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
	}),
);

// export const getCeleryTaskStateQueryPayload = ({
// 	start,
// 	end,
// }: {
// 	start: number;
// 	end: number;
// }): GetQueryResultsProps[] => {
// 	const widgetData = [
// 		celeryRetryTasksTableWidgetData,
// 		celeryFailedTasksTableWidgetData,
// 		celerySuccessTasksTableWidgetData,
// 	];

// 	return widgetData.map((widget) => ({
// 		start,
// 		end,
// 		graphType: PANEL_TYPES.TABLE,
// 		query: widget.query,
// 		selectedTime: 'GLOBAL_TIME',
// 		formatForWeb: true,
// 		variables: {},
// 	}));
// };
