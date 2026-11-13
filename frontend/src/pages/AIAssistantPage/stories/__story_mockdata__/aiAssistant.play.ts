/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, waitFor, within } from 'storybook/test';

interface PlayContext {
	canvasElement: HTMLElement;
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
		await userEvent.click(await find());
		await screen.findByText(opens, undefined, { timeout: 1_000 });
		await new Promise((resolve) => {
			setTimeout(resolve, HOLD_MS);
		});
		screen.getByText(opens);
	}, untilLoaded);
};

export const expandActivity = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const canvas = within(canvasElement);

	await clickUntil(
		() => canvas.findByText(/worked through/i, undefined, untilLoaded),
		/compared checkout p99/i,
	);
	await clickUntil(
		() => canvas.findByText(/compared checkout p99/i, undefined, untilLoaded),
		/^Output$/,
	);
};

/** Opens the approval card's diff dialog. */
export const openApprovalDiff = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
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
}: PlayContext): Promise<void> => {
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
}: PlayContext): Promise<void> => {
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
}: PlayContext): Promise<void> => {
	await clickUntil(
		() =>
			within(canvasElement).findByRole(
				'button',
				{ name: /add context/i },
				untilLoaded,
			),
		/checkout overview/i,
	);
};

export const copyConversationLink = async (
	context: PlayContext,
): Promise<void> => {
	await openConversationActions(context);
	await userEvent.click(await screen.findByText(/copy link/i));
	await screen.findByText(/conversation link copied to clipboard/i);
};
