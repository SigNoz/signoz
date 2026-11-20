/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { AT_BOTTOM_THRESHOLD_PX } from 'container/AIAssistant/components/VirtualizedMessages/constants';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import {
	type AIAssistantArgs,
	composerFree,
	listsConversations,
	showsThread,
} from '../AIAssistantPage.stories.mocks';
import { THREAD_TITLE } from './aiAssistant';

interface PlayContext {
	canvasElement: HTMLElement;
	args: AIAssistantArgs;
}

/** The thread list resolves before the thread does, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

/** How long what a click opened has to stay on screen to count as open. */
const HOLD_MS = 1_000;

/**
 * Click something, and keep clicking until what it opens is on screen. The
 * message list remounts its items while it measures a freshly loaded thread, so
 * a single click can land on a row that is about to be replaced, taking the
 * state it just set with it. The replacement can land after that state has
 * rendered, so it has to still be there `HOLD_MS` later.
 */
const clickUntil = async (
	find: () => Promise<HTMLElement>,
	opens: RegExp,
): Promise<void> => {
	await waitFor(async () => {
		// A click can land after the wait below gave up; clicking again would undo it.
		if (!screen.queryByText(opens)) {
			await userEvent.click(await find());
		}
		await screen.findByText(opens, undefined, { timeout: 1_000 });
		await new Promise((resolve) => {
			setTimeout(resolve, HOLD_MS);
		});
		screen.getByText(opens);
	}, untilLoaded);
};

export const expandActivity = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!(showsThread(args) && args.contents.includes('activity'))) {
		return;
	}

	const canvas = within(canvasElement);

	// The list mounts only messages in view, and a pending reply has its own activity row.
	const first = (text: RegExp): Promise<HTMLElement> =>
		waitFor(() => {
			canvasElement
				.querySelector('[data-virtuoso-scroller]')
				?.scrollTo({ top: 0 });
			return canvas.getAllByText(text)[0];
		}, untilLoaded);

	await clickUntil(() => first(/worked through/i), /compared checkout p99/i);
	await clickUntil(() => first(/compared checkout p99/i), /^Output$/);
};

/** Opens the approval card's diff dialog. */
export const openApprovalDiff = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!(showsThread(args) && args.agent === 'awaiting-approval')) {
		return;
	}

	await clickUntil(
		() =>
			within(canvasElement).findByLabelText(
				/expand diff/i,
				undefined,
				untilLoaded,
			),
		/approval diff/i,
	);
};

export const openNegativeFeedback = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	// The question card fills the list, which then leaves the last answer unmounted.
	if (!showsThread(args) || args.agent === 'awaiting-clarification') {
		return;
	}

	await clickUntil(async () => {
		// Every assistant message carries the bar; only the last one shows it
		// without a hover.
		const bars = await within(canvasElement).findAllByLabelText(
			/bad response/i,
			undefined,
			untilLoaded,
		);

		return bars[bars.length - 1];
	}, /what went wrong/i);
};

export const openConversationActions = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsConversations(args)) {
		return;
	}

	await clickUntil(async () => {
		const [actions] = await within(canvasElement).findAllByLabelText(
			/conversation actions/i,
			undefined,
			untilLoaded,
		);

		return actions;
	}, /copy link/i);
};

export const openContextPicker = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!composerFree(args)) {
		return;
	}

	await clickUntil(
		() =>
			within(canvasElement).findByTestId(
				'ai-chat-input-add-context',
				undefined,
				untilLoaded,
			),
		/checkout overview/i,
	);
};

export const copyConversationLink = async (
	context: PlayContext,
): Promise<void> => {
	if (!listsConversations(context.args)) {
		return;
	}

	await openConversationActions(context);
	await userEvent.click(await screen.findByText(/copy link/i));
	await screen.findByText(/conversation link copied to clipboard/i);
};

const contextOption = (category: string, label = /./): Promise<HTMLElement> =>
	waitFor(() => {
		const option = screen
			.getAllByTestId(new RegExp(`^ai-context-option-${category}-`))
			.find((el) => label.test(el.textContent ?? ''));
		if (!option) {
			throw new Error(`No ${category} option reads ${label}`);
		}
		return option;
	}, untilLoaded);

/** Picks a dashboard and a service, closes the picker, and focuses the last pill's remove. */
export const pickContexts = async (context: PlayContext): Promise<void> => {
	if (!composerFree(context.args)) {
		return;
	}

	await openContextPicker(context);
	await userEvent.click(await contextOption('Dashboards', /checkout overview/i));
	await userEvent.click(await screen.findByTestId('ai-context-tab-Services'));
	await userEvent.click(await contextOption('Services'));
	await userEvent.keyboard('{Escape}');
	// Closing hands focus back to the picker's button.
	await waitFor(() =>
		expect(screen.queryByTestId('ai-context-search')).toBeNull(),
	);

	const removes = await within(context.canvasElement).findAllByTestId(
		'ai-context-pill-remove',
	);
	await expect(removes).toHaveLength(2);
	removes[removes.length - 1].focus();
};

/** A play that opens the activity row whose summary matches, on the threads that have one. */
const openActivity =
	(has: (args: AIAssistantArgs) => boolean, summary: RegExp, opens: RegExp) =>
	async ({ canvasElement, args }: PlayContext): Promise<void> => {
		if (!(showsThread(args) && has(args))) {
			return;
		}

		const row = (): Promise<HTMLElement> =>
			waitFor(() => {
				const found = within(canvasElement)
					.getAllByTestId('ai-activity-toggle')
					.find((el) => summary.test(el.textContent ?? ''));
				if (!found) {
					throw new Error(`No activity row reads ${summary}`);
				}
				return found;
			}, untilLoaded);
		await clickUntil(row, opens);
	};

/** Opens the last answer's lone step. */
export const expandSingleStep = openActivity(
	(args) => args.contents.includes('one-step'),
	/matched the 429s to their upstream/i,
	/signoz_search_traces/,
);

/** Opens the running reply's live steps. */
export const openLiveSteps = openActivity(
	(args) => args.agent === 'streaming',
	/counting checkout calls per minute/i,
	/how much of that budget/i,
);

/** Scrolls the thread to its first message, which brings up the Latest pill. */
export const scrollToTop = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsThread(args)) {
		return;
	}

	const canvas = within(canvasElement);
	let height = -1;
	let since = 0;
	const scroller = await waitFor(() => {
		const list = canvasElement.querySelector<HTMLElement>(
			'[data-virtuoso-scroller]',
		);
		if (!list) {
			throw new Error('The thread has not loaded');
		}
		if (list.scrollHeight !== height) {
			height = list.scrollHeight;
			since = performance.now();
		}
		// Rows measure as they mount, so the height has to hold before it counts.
		if (performance.now() - since < HOLD_MS) {
			throw new Error('The thread is still laying out');
		}
		return list;
	}, untilLoaded);
	if (scroller.scrollHeight - scroller.clientHeight <= AT_BOTTOM_THRESHOLD_PX) {
		return;
	}
	await waitFor(async () => {
		// The app's deferred page scrollbar can reset the list to 0 without a scroll event.
		scroller.scrollTo({ top: scroller.scrollTop === 0 ? 1 : 0 });
		await canvas.findByTestId('ai-assistant-latest', undefined, {
			timeout: 1_000,
		});
		// A list still pinning itself to its end takes the pill away again.
		await new Promise((resolve) => {
			setTimeout(resolve, HOLD_MS);
		});
		canvas.getByTestId('ai-assistant-latest');
	}, untilLoaded);
};

const DRAFT = 'Would a client-side limiter in front of payment.authorize';

/** Types the start of the next question into the composer. */
export const typeDraft = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!composerFree(args)) {
		return;
	}

	// The loading view has a locked composer of its own, swapped out once the thread lands.
	const input = await waitFor(() => {
		const textarea = within(canvasElement).getByTestId('ai-chat-input-textarea');
		if (textarea.hasAttribute('disabled')) {
			throw new Error('The composer is still locked');
		}
		return textarea;
	}, untilLoaded);
	await userEvent.type(input, DRAFT);
	await expect(input).toHaveValue(DRAFT);
};

export const openClarificationSelect = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!showsThread(args) || args.agent !== 'awaiting-clarification') {
		return;
	}

	const canvas = within(canvasElement);

	// Open from the keyboard, and retry: the message list remounts its items
	// while it measures the thread, which can close the popup again. The
	// "Other" checkbox in the Notify field carries the same text, so assert
	// on the popup's option role.
	await waitFor(async () => {
		const severityLabel = canvas.getByText('Severity');
		const field = severityLabel.closest('div');

		if (!field) {
			throw new Error('Severity field is not in the clarification form');
		}

		within(field).getByRole('combobox').focus();
		await userEvent.keyboard('{Enter}');
		await screen.findByRole(
			'option',
			{ name: 'Other (type your own)' },
			{ timeout: 1_000 },
		);
	}, untilLoaded);
};

export const renameConversation = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!listsConversations(args)) {
		return;
	}

	await clickUntil(async () => {
		const [actions] = await within(canvasElement).findAllByLabelText(
			/conversation actions/i,
			undefined,
			untilLoaded,
		);

		return actions;
	}, /^Rename$/);
	await userEvent.click(screen.getByText('Rename'));
	await within(canvasElement).findByDisplayValue(THREAD_TITLE);
};
