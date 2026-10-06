/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import ROUTES from 'constants/routes';
import { rest } from 'msw';
import { MessagingQueueHealthCheckService } from 'pages/MessagingQueues/MessagingQueuesUtils';

import { choiceControl } from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';

import {
	CONFIGURATION_STATES,
	type ConfigurationState,
	onboardingStatusResponse,
} from './__story_mockdata__/kafkaOverview';
import { timeRangeState } from './__story_mockdata__/messagingQueues';

const HEALTH = 'Kafka · health check';

export const kafkaOverviewMocks = defineStoryMocks({
	controls: {
		configuration: choiceControl<ConfigurationState>('Configuration', {
			group: HEALTH,
			description:
				'How much of the kafka instrumentation the onboarding checks find. Anything short of complete turns the header button into a count of what is missing.',
			options: CONFIGURATION_STATES,
			value: 'complete',
		}),
	},
	handlers: (values, response) => [
		rest.post(
			'http://localhost/api/v1/messaging-queues/kafka/onboarding/:service',
			response.json((req) =>
				onboardingStatusResponse(
					req.params.service as MessagingQueueHealthCheckService,
					values.configuration,
				),
			),
		),
	],
	config: () => ({
		route: ROUTES.MESSAGING_QUEUES_KAFKA,
		reduxState: timeRangeState(),
	}),
});
