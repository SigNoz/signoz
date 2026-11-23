/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { Querybuildertypesv5QueryRangeRequestDTO } from 'api/generated/services/sigNoz.schemas';
import ROUTES from 'constants/routes';
import { rest } from 'msw';

import { choiceControl, countControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import { fieldValuesResponse } from '@/storybook/msw/__story_mockdata__/fields';
import { queryRangeV5ForRequest } from '@/storybook/msw/__story_mockdata__/queryRange';

import {
	attributeValues,
	LABEL_VALUES,
	timeRangeState,
} from '../../stories/__story_mockdata__/messagingQueues';
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
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) => {
				const body = (await req.json()) as Querybuildertypesv5QueryRangeRequestDTO;

				return (
					celeryStateCountResponse(body, values.tasks, values.health) ??
					queryRangeV5ForRequest(body, {
						count: groupsByWorker(body) ? values.workers : values.series,
						labelValues: LABEL_VALUES,
					})
				);
			}),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json((req) => {
				const name = req.url.searchParams.get('name') ?? '';
				const found = attributeValues(
					name,
					req.url.searchParams.get('searchText') ?? '',
				);

				return fieldValuesResponse(
					name === 'worker' ? found.slice(0, values.workers) : found,
				);
			}),
		),
	],
	config: () => ({
		route: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
		reduxState: timeRangeState(),
	}),
});

export type CeleryTaskArgs = PageStoryArgs<typeof celeryTaskMocks>;
