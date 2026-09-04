import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessagingQueuesViewTypeOptions } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { kafkaDetailMocks } from './MQDetailPage.stories.mocks';

import MessagingQueuesMainPage from '../MessagingQueuesMainPage';

type KafkaDetailArgs = PageStoryArgs<typeof kafkaDetailMocks>;

const pageStory = storyMocks(kafkaDetailMocks);

/**
 * Kafka consumer lag, partition latency and topic throughput for the view the
 * route names, drilled into by the co-ordinate it carries.
 *
 * Route: `/messaging-queues/kafka/detail`.
 */
const meta = {
	title: 'Pages/Messaging Queues/Kafka Detail',
	tags: ['play'],
	component: MessagingQueuesMainPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<KafkaDetailArgs>;

export default meta;

type Story = StoryObj<KafkaDetailArgs>;

/** The tables fetch after the view has rendered, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/**
 * Consumer lag over the selected consumer groups, topics and partitions, with
 * the producer, consumer and network latency tables for the co-ordinate that is
 * selected on the graph.
 */
export const Default: Story = {};

/** The same view before anything on the graph has been clicked. */
export const NothingSelected: Story = {
	args: { selected: false },
};

/**
 * The round trip between the selected producer and consumer, which is the one
 * detail tab with a client and an instance of its own.
 */
export const NetworkLatency: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(
				'Network Latency',
				undefined,
				untilLoaded,
			),
		);
	},
};

/** Latency per topic partition, and the producers writing to the selected one. */
export const PartitionLatency: Story = {
	args: { view: MessagingQueuesViewTypeOptions.PartitionLatency },
};

/** Throughput per producer and topic, with the byte rate merged in. */
export const ProducerLatency: Story = {
	args: { view: MessagingQueuesViewTypeOptions.ProducerLatency },
};

/** The consumers of the same topics, which the toggle above the table swaps to. */
export const ProducerLatencyConsumers: Story = {
	args: { view: MessagingQueuesViewTypeOptions.ProducerLatency },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText('Consumers', undefined, untilLoaded),
		);
	},
};

/** Producer/consumer pairs whose spans breached the evaluation interval. */
export const DropRate: Story = {
	args: { view: MessagingQueuesViewTypeOptions.DropRate },
};

/** The broker, producer, consumer and JVM metrics kafka itself reports. */
export const MetricView: Story = {
	args: { view: MessagingQueuesViewTypeOptions.MetricPage },
};
