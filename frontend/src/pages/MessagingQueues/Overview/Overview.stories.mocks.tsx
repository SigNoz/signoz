/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import type { QueryRangePayload } from 'types/api/metrics/getQueryRange';

import {
	choiceControl,
	countControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	attributeValuesResponse,
	queryRangeV3ForRequest,
	timeRangeState,
} from '../__story_mockdata__/messagingQueues';
import {
	MESSAGING_SYSTEMS,
	type MessagingSystemFilter,
	overviewValueResponse,
	queueOverviewResponse,
} from './__story_mockdata__/queueOverview';

const QUEUES = 'Overview · queues';
const DETAIL = 'Overview · detail';

/** The table pages at twenty, so the cap has to leave room for a second page. */
const QUEUE_MAX = 40;

export const queueOverviewMocks = defineStoryMocks({
	controls: {
		queues: countControl('Queues', {
			group: QUEUES,
			value: 14,
			max: QUEUE_MAX,
		}),
		system: choiceControl<MessagingSystemFilter>('Messaging system', {
			group: QUEUES,
			description:
				'Which broker the rows report. The detail panel filters celery destinations on a different attribute than everything else.',
			options: MESSAGING_SYSTEMS,
			value: 'mixed',
		}),
		failing: toggleControl('Failing queues', {
			group: QUEUES,
			description:
				'Pushes every third row past the error thresholds the progress bar colours amber and red at.',
			value: false,
		}),
		series: countControl('Detail series', {
			group: DETAIL,
			description: 'Lines the charts in the right panel draw per group.',
			value: 3,
			max: 6,
		}),
	},
	handlers: (values, response) => {
		const queryRange = response.json(async (req) => {
			const body = (await req.json()) as QueryRangePayload;

			return (
				overviewValueResponse(body, values.failing) ??
				queryRangeV3ForRequest(body, values.series)
			);
		});

		return [
			rest.post(
				'http://localhost/api/v1/messaging-queues/queue-overview',
				response.json(async (req) => {
					const body = (await req.json()) as { end: number };

					return {
						status: 'success',
						data: queueOverviewResponse(
							values.queues,
							values.system,
							values.failing,
							body.end / 1e6,
						),
					};
				}),
			),

			rest.post('http://localhost/api/v3/query_range', queryRange),
			rest.post('http://localhost/api/v4/query_range', queryRange),

			rest.get(
				'http://localhost/api/v3/autocomplete/attribute_values',
				response.json((req) =>
					attributeValuesResponse(
						req.url.searchParams.get('attributeKey') ?? '',
						req.url.searchParams.get('searchText') ?? '',
					),
				),
			),
		];
	},
	config: () => ({
		route: ROUTES.MESSAGING_QUEUES_OVERVIEW,
		reduxState: timeRangeState(),
	}),
});
