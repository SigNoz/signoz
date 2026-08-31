/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import type { QueryRangePayload } from 'types/api/metrics/getQueryRange';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	attributeValuesResponse,
	queryRangeV3ForRequest,
	timeRangeState,
} from '../__story_mockdata__/messagingQueues';
import {
	celeryStateCountResponse,
	groupsByWorker,
	TASK_HEALTH_STATES,
	type TaskHealth,
} from './__story_mockdata__/celeryTask';

const TASKS = 'Celery · tasks';
const GRAPHS = 'Celery · graphs';

/** Worker names the metrics carry, which is what the online card counts. */
const WORKER_MAX = 3;

export const celeryTaskMocks = defineStoryMocks({
	controls: {
		tasks: countControl('Tasks run', {
			group: TASKS,
			description:
				'The all-states counter above the state graph, which the other three are a share of.',
			value: 1200,
			max: 5000,
		}),
		health: choiceControl<TaskHealth>('Task health', {
			group: TASKS,
			description:
				'How the run splits across success, retry and failure, which is what the counters and the state graph tabs show.',
			options: TASK_HEALTH_STATES,
			value: 'degraded',
		}),
		workers: countControl('Workers online', {
			group: TASKS,
			description:
				'Workers the flower metrics report: the card next to the active tasks graph counts them, and the per-worker charts draw one line each.',
			value: WORKER_MAX,
			max: WORKER_MAX,
		}),
		series: countControl('Graph series', {
			group: GRAPHS,
			description:
				'Lines the span-based charts draw per task. The per-worker charts follow the worker count instead.',
			value: 3,
			max: 6,
		}),
	},
	handlers: (values, response) => {
		const queryRange = response.json(async (req) => {
			const body = (await req.json()) as QueryRangePayload;

			return (
				celeryStateCountResponse(body, values.tasks, values.health) ??
				queryRangeV3ForRequest(
					body,
					groupsByWorker(body) ? values.workers : values.series,
				)
			);
		});

		return [
			rest.post('http://localhost/api/v3/query_range', queryRange),
			rest.post('http://localhost/api/v4/query_range', queryRange),

			rest.get(
				'http://localhost/api/v3/autocomplete/attribute_values',
				response.json((req) => {
					const attributeKey = req.url.searchParams.get('attributeKey') ?? '';
					const values_ = attributeValuesResponse(
						attributeKey,
						req.url.searchParams.get('searchText') ?? '',
					);

					if (attributeKey !== 'worker') {
						return values_;
					}

					return {
						...values_,
						data: {
							...values_.data,
							stringAttributeValues: (values_.data.stringAttributeValues ?? []).slice(
								0,
								values.workers,
							),
						},
					};
				}),
			),
		];
	},
	config: () => ({
		route: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
		reduxState: timeRangeState(),
	}),
});
