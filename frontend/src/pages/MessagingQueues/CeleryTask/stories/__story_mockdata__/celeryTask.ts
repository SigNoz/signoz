/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5RequestTypeDTO,
	type Querybuildertypesv5BuilderQuerySpecDTO,
	type Querybuildertypesv5QueryRangeRequestDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { MetricRangePayloadV5 } from 'types/api/v5/queryRange';

import { queryRangeV5ScalarResponse } from '@/storybook/msw/__story_mockdata__/queryRange';

export const TASK_HEALTH_STATES = ['healthy', 'degraded', 'failing'] as const;

export type TaskHealth = (typeof TASK_HEALTH_STATES)[number];

/** Share of tasks that end in each terminal state, per health. */
const FAILURE_SHARE: Record<TaskHealth, { failed: number; retried: number }> = {
	healthy: { failed: 0.004, retried: 0.011 },
	degraded: { failed: 0.038, retried: 0.092 },
	failing: { failed: 0.21, retried: 0.27 },
};

const builderSpecs = (
	body: Querybuildertypesv5QueryRangeRequestDTO,
): Querybuildertypesv5BuilderQuerySpecDTO[] =>
	(body.compositeQuery?.queries ?? []).flatMap((envelope) =>
		envelope.type ===
			Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query && envelope.spec
			? [envelope.spec]
			: [],
	);

/**
 * The four counters above the state graph are four `VALUE` requests that differ
 * only by their `celery.state` filter, so the split has to be read off the
 * request rather than answered the same way four times.
 */
const filteredState = (
	specs: Querybuildertypesv5BuilderQuerySpecDTO[],
): string | undefined =>
	specs
		.map(
			(spec) =>
				/celery\.state\s*=\s*'([^']+)'/.exec(spec.filter?.expression ?? '')?.[1],
		)
		.find(Boolean);

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
 * requests and the generic builder should take it.
 */
export const celeryStateCountResponse = (
	body: Querybuildertypesv5QueryRangeRequestDTO,
	tasks: number,
	health: TaskHealth,
): MetricRangePayloadV5 | null => {
	const specs = builderSpecs(body);
	const countsSpans = specs.some((spec) =>
		(spec.aggregations ?? []).some(
			(aggregation) =>
				'expression' in aggregation && aggregation.expression?.includes('span_id'),
		),
	);

	if (
		body.requestType !== Querybuildertypesv5RequestTypeDTO.scalar ||
		!countsSpans
	) {
		return null;
	}

	return queryRangeV5ScalarResponse(
		countFor(filteredState(specs), tasks, health),
	);
};

/**
 * The flower graphs and the online-worker card read the same set of workers, so
 * a request grouped by `worker` has to draw as many lines as the card counts.
 */
export const groupsByWorker = (
	body: Querybuildertypesv5QueryRangeRequestDTO,
): boolean =>
	builderSpecs(body).some((spec) =>
		(spec.groupBy ?? []).some((key) => key.name === 'worker'),
	);
