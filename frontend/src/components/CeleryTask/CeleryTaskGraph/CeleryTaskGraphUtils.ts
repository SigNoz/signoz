/* eslint-disable sonarjs/no-duplicate-string */
import { PANEL_TYPES } from 'constants/queryBuilder';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { getWidgetQuery } from 'pages/MessagingQueues/MQDetails/MetricPage/MetricPageUtil';
import { Widgets } from 'types/api/dashboard/getAll';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource, ReduceOperators } from 'types/common/queryBuilder';
import { v4 as uuidv4 } from 'uuid';
import { getStepInterval } from './CeleryTaskGraphTimeUtils';

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
							key: 'celery.state',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.state}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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
							key: 'celery.hostname',
							type: 'tag',
						},
					],
					having: [],
					legend: '{{celery.hostname}}',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
					spaceAggregation: 'sum',
					stepInterval: getStepInterval(startTime, endTime),
					timeAggregation: 'rate',
				},
			],
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
					reduceTo: ReduceOperators.AVG,
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
				reduceTo: ReduceOperators.AVG,
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
				reduceTo: ReduceOperators.AVG,
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
				reduceTo: ReduceOperators.AVG,
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
				reduceTo: ReduceOperators.AVG,
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
							key: 'celery.task_name',
							type: 'tag',
						},
					],
					having: [],
					legend: '',
					limit: null,
					orderBy: [],
					queryName: 'A',
					reduceTo: ReduceOperators.AVG,
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
				reduceTo: ReduceOperators.LAST,
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
				reduceTo: ReduceOperators.LAST,
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
				reduceTo: ReduceOperators.LAST,
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
				reduceTo: ReduceOperators.LAST,
				spaceAggregation: 'sum',
				stepInterval: 60,
				timeAggregation: 'count_distinct',
			},
		],
	}),
);
