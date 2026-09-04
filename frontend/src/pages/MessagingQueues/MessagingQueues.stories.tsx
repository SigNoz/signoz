import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { kafkaOverviewMocks } from './MessagingQueues.stories.mocks';

import MessagingQueuesMainPage from './MessagingQueuesMainPage';

type KafkaOverviewArgs = PageStoryArgs<typeof kafkaOverviewMocks>;

const pageStory = storyMocks(kafkaOverviewMocks);

/**
 * The Kafka setup page: what each part of the pipeline reports before the detail
 * views have anything to show.
 *
 * Route: `/messaging-queues/kafka`.
 */
const meta = {
	title: 'Pages/Messaging Queues/Kafka',
	tags: ['play'],
	component: MessagingQueuesMainPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<KafkaOverviewArgs>;

export default meta;

type Story = StoryObj<KafkaOverviewArgs>;

/** The button waits on all three onboarding calls, and swallows clicks until. */
const untilLoaded = { timeout: 15_000 };

/**
 * The kafka landing tab: how to instrument producers, consumers and the broker,
 * then the five views the detail page offers, with the instrumentation health
 * check in the header.
 */
export const Default: Story = {};

/**
 * The header button when the instrumentation is incomplete, counting the
 * attributes the onboarding checks did not find.
 */
export const MissingConfiguration: Story = {
	args: { configuration: 'partial' },
};

/** The checklist behind the header button: every attribute, per service. */
export const ConfigurationChecklist: Story = {
	args: { configuration: 'partial' },
	play: async ({ canvasElement }): Promise<void> => {
		const canvas = within(canvasElement);

		// The button reads plain "Configuration" while the checks are in flight and
		// ignores clicks until they land, so the count is what to wait on.
		await userEvent.click(
			await canvas.findByRole(
				'button',
				{ name: /missing configuration/i },
				untilLoaded,
			),
		);
		await screen.findByText('Kafka Service Attributes', undefined, untilLoaded);
	},
};
