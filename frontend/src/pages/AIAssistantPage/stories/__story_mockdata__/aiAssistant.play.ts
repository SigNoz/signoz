/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, waitFor, within } from 'storybook/test';

import {
	type AIAssistantArgs,
	composerFree,
	listsConversations,
	showsThread,
} from '../AIAssistantPage.stories.mocks';

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
