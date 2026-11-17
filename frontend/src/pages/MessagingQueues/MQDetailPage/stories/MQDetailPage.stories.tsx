import type { Meta, StoryObj } from '@storybook/react-vite';
import { MessagingQueuesViewTypeOptions } from 'pages/MessagingQueues/MessagingQueuesUtils';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';

import {
	openCustomInterval,
	showConsumers,
	showNetworkLatency,
} from './__story_mockdata__/kafkaDetail.play';
import {
	type KafkaDetailArgs,
	kafkaDetailMocks,
} from './MQDetailPage.stories.mocks';

import MessagingQueuesMainPage from '../../MessagingQueuesMainPage';

const pageStory = storyMocks(kafkaDetailMocks, { layout: 'app' });

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
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<KafkaDetailArgs>;

export default meta;

type Story = StoryObj<KafkaDetailArgs>;

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
	play: showNetworkLatency,
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
	play: showConsumers,
};

/** The custom-interval input inside the evaluation-time dropdown. */
export const DropRateIntervalOpen: Story = {
	args: { view: MessagingQueuesViewTypeOptions.DropRate },
	play: openCustomInterval,
};

/** The broker, producer, consumer and JVM metrics kafka itself reports. */
export const MetricView: Story = {
	args: { view: MessagingQueuesViewTypeOptions.MetricPage },
};
