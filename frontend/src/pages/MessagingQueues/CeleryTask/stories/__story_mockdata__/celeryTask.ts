/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	DashboardtypesSourceDTO,
	type DashboardtypesGettableSystemDashboardDTO,
	type GetSystemDashboard200,
} from 'api/generated/services/sigNoz.schemas';
import type {
	MetricRangePayloadV5,
	QueryRangeRequestV5,
} from 'types/api/v5/queryRange';

import {
	queryRangeV5ScalarResponse,
	queryRangeV5TimeSeriesResponse,
	timeSeriesPoints,
} from '@/storybook/msw/__story_mockdata__/queryRange';

import celeryTasksDefinition from '../../../../../../../pkg/modules/dashboard/impldashboard/fs/definitions/celery-tasks.json';
import {
	CELERY_TASKS,
	CELERY_WORKERS,
} from '../../../stories/__story_mockdata__/messagingQueues';

export const TASK_HEALTH_STATES = ['healthy', 'degraded', 'failing'] as const;

export type TaskHealth = (typeof TASK_HEALTH_STATES)[number];

/** Share of tasks that end in each terminal state, per health. */
const STATE_SHARE: Record<TaskHealth, Record<string, number>> = {
	healthy: { SUCCESS: 0.985, RETRY: 0.011, FAILURE: 0.004 },
	degraded: { SUCCESS: 0.87, RETRY: 0.092, FAILURE: 0.038 },
	failing: { SUCCESS: 0.52, RETRY: 0.27, FAILURE: 0.21 },
};

/** Tasks per bucket across every state, before the health split. */
const TASKS_PER_BUCKET = 400;

/** One-minute buckets in the story's 30 minute window. */
const BUCKETS = 30;

export const celeryTasksSystemDashboardResponse = (): GetSystemDashboard200 => {
	const { definition } = celeryTasksDefinition;

	return {
		status: 'success',
		data: {
			orgId: 'storybook-org',
			locked: true,
			source: DashboardtypesSourceDTO.system,
			name: definition.name,
			schemaVersion: definition.schemaVersion,
			tags: [],
			spec: definition.spec as DashboardtypesGettableSystemDashboardDTO['spec'],
		},
	};
};

interface CeleryQuerySpec {
	name?: string;
	signal?: string;
	disabled?: boolean;
	expression?: string;
	groupBy?: { name: string }[];
	filter?: { expression?: string };
	aggregations?: { expression?: string; metricName?: string }[];
}

export interface CeleryValues {
	health: TaskHealth;
	workers: number;
	flower: boolean;
	series: number;
}

/** The state a panel filters on (`celery.state = 'FAILURE'`), if any. */
const filteredState = (spec: CeleryQuerySpec): string | undefined =>
	/celery\.state = '(\w+)'/.exec(spec.filter?.expression ?? '')?.[1];

const levelFor = (spec: CeleryQuerySpec, health: TaskHealth): number => {
	const aggregation = spec.aggregations?.[0]?.expression ?? '';
	const state = filteredState(spec);

	if (state) {
		return TASKS_PER_BUCKET * STATE_SHARE[health][state];
	}
	if (aggregation.startsWith('p')) {
		return 2.4e8;
	}
	if (aggregation.startsWith('rate')) {
		return 6;
	}
	return TASKS_PER_BUCKET;
};

const labelValues = (group: string, values: CeleryValues): string[] => {
	if (group === 'worker' || group === 'celery.hostname') {
		return CELERY_WORKERS.slice(0, values.workers);
	}
	if (group === 'celery.state') {
		return Object.keys(STATE_SHARE[values.health]);
	}
	if (group === 'celery.task_name') {
		return CELERY_TASKS.slice(0, values.series);
	}
	return [];
};

/**
 * Answers a Celery panel. A count panel gets the window's total for its state.
 * A chart groups by at most one key, so a query draws one line per value of
 * it. The error formula is the failed share in percent.
 */
export const celeryQueryRangeResponse = (
	body: QueryRangeRequestV5,
	values: CeleryValues,
): MetricRangePayloadV5 => {
	const specs = (body.compositeQuery?.queries ?? []).map(
		(query) => query.spec as unknown as CeleryQuerySpec,
	);
	const workerGroups = labelValues('celery.hostname', values);

	if (body.requestType === 'scalar') {
		const [spec] = specs;
		const state = spec ? filteredState(spec) : undefined;
		const share = state ? STATE_SHARE[values.health][state] : 1;
		return queryRangeV5ScalarResponse(
			Math.round(TASKS_PER_BUCKET * BUCKETS * share),
			spec?.name ?? 'A',
		);
	}

	return queryRangeV5TimeSeriesResponse(
		specs
			.filter((spec) => !spec.disabled)
			.map((spec, queryIndex) => {
				const point = (
					base: number,
					line: number,
				): ReturnType<typeof timeSeriesPoints> =>
					timeSeriesPoints({
						start: body.start,
						end: body.end,
						base,
						amplitude: base * 0.2,
						seed: queryIndex * 5 + line,
					});

				if (spec.expression) {
					return {
						queryName: spec.name ?? 'F1',
						series: workerGroups.map((worker, line) => ({
							labels: [{ key: { name: 'celery.hostname' }, value: worker }],
							values: point(STATE_SHARE[values.health].FAILURE * 100, line),
						})),
					};
				}

				if (spec.signal === 'metrics' && !values.flower) {
					return { queryName: spec.name ?? 'A', series: [] };
				}

				const group = spec.groupBy?.[0]?.name;
				const base = spec.signal === 'metrics' ? 4 : levelFor(spec, values.health);
				const lines = group ? labelValues(group, values) : [''];

				return {
					queryName: spec.name ?? 'A',
					series: lines.map((value, line) => ({
						labels: group ? [{ key: { name: group }, value }] : [],
						values: point(
							group === 'celery.state'
								? TASKS_PER_BUCKET * STATE_SHARE[values.health][value]
								: base * (1 - line * 0.15),
							line,
						),
					})),
				};
			}),
	);
};
