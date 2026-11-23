import { prepareQueryRangePayloadV5 } from 'api/v5/queryRange/prepareQueryRangePayloadV5';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { celeryOverviewErrorRateGraphData } from 'pages/Celery/CeleryOverview/CeleryOverviewGraphUtils';
import { Widgets } from 'types/api/widgets/widget';

import {
	celeryAllStateWidgetData,
	celeryErrorByWorkerWidgetData,
	celeryLatencyByWorkerWidgetData,
	celerySlowestTasksTableWidgetData,
	celeryTaskLatencyWidgetData,
	celeryTasksByWorkerWidgetData,
} from '../CeleryTaskGraphUtils';

const START = 1_700_000_000_000_000_000;
const END = START + 3_600_000_000_000;

const v5Queries = (
	widget: Widgets,
): ReturnType<
	typeof prepareQueryRangePayloadV5
>['queryPayload']['compositeQuery']['queries'] =>
	prepareQueryRangePayloadV5({
		query: widget.query,
		graphType: PANEL_TYPES.TIME_SERIES,
		selectedTime: 'GLOBAL_TIME',
		start: 1_700_000_000,
		end: 1_700_003_600,
	}).queryPayload.compositeQuery.queries;

const builderQuery = (
	name: string,
	expression: string,
): ReturnType<typeof expect.objectContaining> =>
	expect.objectContaining({
		type: 'builder_query',
		spec: expect.objectContaining({
			name,
			signal: 'traces',
			aggregations: [{ expression }],
		}),
	});

const formula = (
	name: string,
	expression: string,
): ReturnType<typeof expect.objectContaining> =>
	expect.objectContaining({
		type: 'builder_formula',
		spec: expect.objectContaining({ name, expression }),
	});

describe('Celery widgets on query_range v5', () => {
	it.each([
		['tasks by worker', celeryTasksByWorkerWidgetData(START, END), 'rate()'],
		[
			'latency by worker',
			celeryLatencyByWorkerWidgetData(START, END),
			'p99(duration_nano)',
		],
		[
			'task latency tab',
			celeryTaskLatencyWidgetData('p95', START, END),
			'p95(duration_nano)',
		],
	])('%s sends its own aggregation', (_name, widget, expression) => {
		expect(v5Queries(widget)).toStrictEqual([builderQuery('A', expression)]);
	});

	it.each([
		[
			'task latency tab',
			celeryTaskLatencyWidgetData('p95', START, END),
			'p95(duration_nano)',
			'asc',
		],
		[
			'slowest tasks table',
			celerySlowestTasksTableWidgetData,
			'avg(duration_nano)',
			'desc',
		],
	])('%s orders by its aggregation', (_name, widget, name, direction) => {
		expect(v5Queries(widget)).toStrictEqual([
			expect.objectContaining({
				spec: expect.objectContaining({
					order: [{ key: { name }, direction }],
				}),
			}),
		]);
	});

	it.each([
		[
			'all states bar',
			celeryAllStateWidgetData(START, END),
			'celery.state exists',
		],
		[
			'tasks by worker',
			celeryTasksByWorkerWidgetData(START, END),
			'celery.hostname exists',
		],
		[
			'task latency tab',
			celeryTaskLatencyWidgetData('p95', START, END),
			'celery.task_name exists',
		],
	])('%s drops spans without its group-by key', (_name, widget, expression) => {
		expect(v5Queries(widget)).toStrictEqual([
			expect.objectContaining({
				spec: expect.objectContaining({ filter: { expression } }),
			}),
		]);
	});

	it('error % by worker sends its formula as a formula', () => {
		expect(v5Queries(celeryErrorByWorkerWidgetData(START, END))).toStrictEqual([
			builderQuery('A', 'count_distinct(span_id)'),
			builderQuery('B', 'count_distinct(span_id)'),
			formula('F1', '(A/B)*100'),
		]);
	});

	it('overview error rate sends both formulas as formulas', () => {
		expect(v5Queries(celeryOverviewErrorRateGraphData(START, END))).toStrictEqual(
			[
				builderQuery('A', 'count_distinct(span_id)'),
				builderQuery('B', 'count_distinct(span_id)'),
				builderQuery('C', 'count_distinct(span_id)'),
				formula('F1', '(A/C)*100'),
				formula('F2', '(B/C)*100'),
			],
		);
	});
});
