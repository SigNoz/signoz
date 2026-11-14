/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import type { QueryRangeRequestV5 } from 'types/api/v5/queryRange';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import { fieldValuesResponse } from '@/storybook/msw/__story_mockdata__/fields';

import {
	CELERY_TASKS,
	CELERY_WORKERS,
	timeRangeState,
} from '../../stories/__story_mockdata__/messagingQueues';
import {
	celeryQueryRangeResponse,
	celeryTasksSystemDashboardResponse,
	TASK_HEALTH_STATES,
	type TaskHealth,
} from './__story_mockdata__/celeryTask';

const TASKS = 'Celery · tasks';
const GRAPHS = 'Celery · graphs';

export const celeryTaskMocks = defineStoryMocks({
	controls: {
		health: choiceControl<TaskHealth>('Task health', {
			group: TASKS,
			description:
				'How runs split across success, retry and failure: the state charts and the error % by worker follow it.',
			options: TASK_HEALTH_STATES,
			value: 'degraded',
		}),
		workers: countControl('Workers', {
			group: TASKS,
			description:
				'Workers running tasks: the per-worker charts draw one line each.',
			value: CELERY_WORKERS.length,
			max: CELERY_WORKERS.length,
		}),
		flower: toggleControl('Flower metrics', {
			group: TASKS,
			description:
				'Whether Flower is scraped. Without it the active tasks chart is empty; the span charts are not affected.',
			value: true,
		}),
		series: countControl('Tasks charted', {
			group: GRAPHS,
			description: 'Task names the latency charts draw a line for.',
			value: 3,
			max: CELERY_TASKS.length,
		}),
	},
	handlers: (values, response) => [
		rest.get(
			'http://localhost/api/v2/dashboards/system/celery-tasks',
			response.json(() => celeryTasksSystemDashboardResponse()),
		),

		rest.post(
			'http://localhost/api/v5/query_range',
			response.json(async (req) =>
				celeryQueryRangeResponse((await req.json()) as QueryRangeRequestV5, values),
			),
		),

		rest.get(
			'http://localhost/api/v1/fields/values',
			response.json(() => fieldValuesResponse(CELERY_TASKS)),
		),
	],
	config: () => ({
		route: ROUTES.MESSAGING_QUEUES_CELERY_TASK,
		reduxState: timeRangeState(),
	}),
});
