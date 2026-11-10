/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { MessagingQueuesViewTypeOptions } from 'pages/MessagingQueues/MessagingQueuesUtils';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import type { KafkaDetailArgs } from '../MQDetailPage.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: KafkaDetailArgs;
}

/** The tables fetch after the view has rendered, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

export const showNetworkLatency = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.view !== MessagingQueuesViewTypeOptions.ConsumerLag ||
		!args.selected ||
		args.dataState !== 'loaded'
	) {
		return;
	}

	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByText('Network Latency', undefined, untilLoaded),
	);
	// The table refetches for the tab, and titles itself after it: the label is
	// on the toggle and on the table once the swap is through.
	await waitFor(
		() => expect(canvas.getAllByText('Network Latency')).toHaveLength(2),
		untilLoaded,
	);
};

export const showConsumers = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.view !== MessagingQueuesViewTypeOptions.ProducerLatency ||
		args.dataState !== 'loaded'
	) {
		return;
	}

	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByText('Consumers', undefined, untilLoaded),
	);
	// Byte Rate is the column only the producer table has.
	await waitFor(
		() => expect(canvas.queryByText('Byte Rate')).not.toBeInTheDocument(),
		untilLoaded,
	);
};

export const openDropRateInterval = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.view !== MessagingQueuesViewTypeOptions.DropRate ||
		args.dataState !== 'loaded'
	) {
		return;
	}

	await userEvent.click(
		await within(canvasElement).findByText('10ms', undefined, untilLoaded),
	);
	await screen.findByPlaceholderText(
		'Enter custom time (ms)',
		undefined,
		untilLoaded,
	);
};
