/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { userEvent, waitFor, within } from 'storybook/test';

import { ThreadView } from '../../types';
import {
	type TraceThreadArgs,
	untilThreadLoaded,
} from '../TraceDetailsThread.stories.mocks';
import { threadSpanCount } from './traceThread';
import type { ThreadScenario } from './types';

interface PlayContext {
	canvasElement: HTMLElement;
	args: TraceThreadArgs;
}

const SYSTEM_PROMPT_SCENARIOS: readonly ThreadScenario[] = [
	'conversation',
	'roles-and-finish-reasons',
];

const showsFormattedCards = (args: TraceThreadArgs): boolean =>
	args.dataState === 'loaded' &&
	args.view === ThreadView.Formatted &&
	args.scenario !== 'no-ai-spans' &&
	args.anchor !== 'span-not-found';

const clickAll = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	const toggles = await within(canvasElement).findAllByTestId(
		testId,
		undefined,
		untilThreadLoaded,
	);

	await toggles.reduce(
		(previous, toggle) => previous.then(() => userEvent.click(toggle)),
		Promise.resolve(),
	);
};

export const expandSystemPrompts = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		!showsFormattedCards(args) ||
		!SYSTEM_PROMPT_SCENARIOS.includes(args.scenario)
	) {
		return;
	}

	await clickAll(canvasElement, 'ai-message-system-toggle');
};

/** Reasoning, compaction and long text all sit on the first page of `every-part`. */
export const expandEveryPart = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsFormattedCards(args) || args.scenario !== 'every-part') {
		return;
	}

	await clickAll(canvasElement, 'ai-message-thinking-toggle');
	await clickAll(canvasElement, 'ai-message-compaction-toggle');
	await clickAll(canvasElement, 'ai-message-show-more');
};

/** Only `conversation` has a linkable tool result on its first page. */
export const followToolResultLink = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsFormattedCards(args) || args.scenario !== 'conversation') {
		return;
	}

	const [link] = await within(canvasElement).findAllByTestId(
		'ai-tool-result-link',
		undefined,
		untilThreadLoaded,
	);
	await userEvent.click(link);
};

/** The second page is only requested once the list end scrolls into view. */
export const scrollToNextPage = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (
		args.dataState !== 'loaded' ||
		args.paging !== 'next-page-pending' ||
		args.anchor === 'span-not-found' ||
		threadSpanCount(args.scenario) < 2
	) {
		return;
	}

	const canvas = within(canvasElement);
	const list = await canvas.findByTestId(
		'thread-span-list',
		undefined,
		untilThreadLoaded,
	);

	await waitFor(() => {
		list.scrollTo({ top: list.scrollHeight });
		return canvas.getByTestId('thread-loading-next');
	}, untilThreadLoaded);
};
