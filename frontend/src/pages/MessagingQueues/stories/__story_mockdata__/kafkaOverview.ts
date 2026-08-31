/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { OnboardingStatusResponse } from 'api/messagingQueues/onboarding/getOnboardingStatus';
import { MessagingQueueHealthCheckService } from 'pages/MessagingQueues/MessagingQueuesUtils';

export const CONFIGURATION_STATES = ['complete', 'partial', 'missing'] as const;

export type ConfigurationState = (typeof CONFIGURATION_STATES)[number];

/**
 * What each onboarding endpoint checks for. The page never reads the names, so
 * the only thing that matters is that they are the span attributes the kafka
 * instrumentation is supposed to emit.
 */
const CHECKED_ATTRIBUTES: Record<MessagingQueueHealthCheckService, string[]> = {
	[MessagingQueueHealthCheckService.Consumers]: [
		'messaging.system',
		'messaging.destination.name',
		'messaging.kafka.consumer.group',
		'messaging.kafka.message.offset',
		'messaging.destination.partition.id',
		'service.name',
	],
	[MessagingQueueHealthCheckService.Producers]: [
		'messaging.system',
		'messaging.destination.name',
		'messaging.destination.partition.id',
		'messaging.message.body.size',
		'service.name',
	],
	[MessagingQueueHealthCheckService.Kafka]: [
		'kafka.consumer_group.lag',
		'kafka.partition.current_offset',
		'kafka.partition.oldest_offset',
		'kafka.topic.partitions',
		'kafka.brokers',
	],
};

/**
 * `'1'` is a checked attribute the backend saw, `'0'` one it did not: the
 * header button counts the zeroes and the checklist tree renders their
 * `error_message` behind the Fix link.
 */
const attributeStatus = (
	state: ConfigurationState,
	index: number,
): '0' | '1' => {
	if (state === 'complete') {
		return '1';
	}

	if (state === 'missing') {
		return '0';
	}

	return index % 3 === 0 ? '0' : '1';
};

export const onboardingStatusResponse = (
	service: MessagingQueueHealthCheckService,
	state: ConfigurationState,
): OnboardingStatusResponse => ({
	status: 'success',
	data: CHECKED_ATTRIBUTES[service].map((attribute, index) => {
		const status = attributeStatus(state, index);

		return {
			attribute,
			status,
			error_message:
				status === '0' ? `No span in the selected range carried ${attribute}.` : '',
		};
	}),
});
