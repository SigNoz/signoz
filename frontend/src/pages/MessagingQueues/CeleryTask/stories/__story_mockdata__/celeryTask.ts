/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { QueryRangePayload } from 'types/api/metrics/getQueryRange';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import {
	type QueryRangeV3Body,
	queryRangeV3TimeSeriesResponse,
	v3Series,
} from '@/storybook/msw/__story_mockdata__/queryRange';

export const TASK_HEALTH_STATES = ['healthy', 'degraded', 'failing'] as const;

export type TaskHealth = (typeof TASK_HEALTH_STATES)[number];

/** Share of tasks that end in each terminal state, per health. */
const FAILURE_SHARE: Record<TaskHealth, { failed: number; retried: number }> = {
	healthy: { failed: 0.004, retried: 0.011 },
	degraded: { failed: 0.038, retried: 0.092 },
	failing: { failed: 0.21, retried: 0.27 },
};

const CELERY_STATE_KEY = 'celery.state';

/**
 * The four counters above the state graph are four `VALUE` requests that differ
 * only by their `celery.state` filter, so the split has to be read off the
 * request rather than answered the same way four times.
 */
const filteredState = (body: QueryRangePayload): string | undefined => {
	const queries = Object.values(body.compositeQuery.builderQueries ?? {});

	for (const query of queries) {
		const items = (query as IBuilderQuery).filters?.items ?? [];
		const stateFilter = items.find((item) => item.key?.key === CELERY_STATE_KEY);

		if (stateFilter) {
			return String(stateFilter.value);
		}
	}

	return undefined;
};

const countFor = (
	state: string | undefined,
	tasks: number,
	health: TaskHealth,
): number => {
	const { failed, retried } = FAILURE_SHARE[health];

	if (state === 'FAILURE') {
		return Math.round(tasks * failed);
	}

	if (state === 'RETRY') {
		return Math.round(tasks * retried);
	}

	if (state === 'SUCCESS') {
		return Math.round(tasks * (1 - failed - retried));
	}

	return tasks;
};

/**
 * Answers a state counter, or `null` when the request is one of the page's other
 * `VALUE` panels and the generic builder should take it.
 */
export const celeryStateCountResponse = (
	body: QueryRangePayload,
	tasks: number,
	health: TaskHealth,
): QueryRangeV3Body | null => {
	const queries = Object.values(body.compositeQuery.builderQueries ?? {});
	const aggregatesSpans = queries.some(
		(query) => (query as IBuilderQuery).aggregateAttribute?.key === 'span_id',
	);

	if (!aggregatesSpans) {
		return null;
	}

	return queryRangeV3TimeSeriesResponse([
		{
			queryName: 'A',
			series: [
				v3Series({}, [
					{
						timestamp: body.end,
						value: String(countFor(filteredState(body), tasks, health)),
					},
				]),
			],
		},
	]);
};

/**
 * The flower graphs and the online-worker card read the same set of workers, so
 * a request grouped by `worker` has to draw as many lines as the card counts.
 */
export const groupsByWorker = (body: QueryRangePayload): boolean =>
	Object.values(body.compositeQuery.builderQueries ?? {}).some((query) =>
		((query as IBuilderQuery).groupBy ?? []).some((key) => key.key === 'worker'),
	);
