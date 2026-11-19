/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { toast } from '@signozhq/ui/sonner';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import type { GlobalMockArgs } from '../../globals';

interface PlayContext {
	args: GlobalMockArgs;
}

/** The shell renders its entry points after the global config and the license settle. */
const untilLoaded = { timeout: 10_000 };

/** How long the thread has to stay scrolled to its end to count as settled there. */
const HOLD_MS = 1_000;

const gapBelowView = (): number => {
	const scroller = document.querySelector<HTMLElement>(
		'[data-virtuoso-scroller]',
	);
	return scroller
		? scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop
		: Infinity;
};

export const openAddCardModal = async (): Promise<void> => {
	await userEvent.click(
		await screen.findByTestId('bottom-strip-support', undefined, untilLoaded),
	);
	await screen.findByRole('dialog', {
		name: /Add Credit Card for Chat Support/i,
	});
};

export const openNozPanel = async ({ args }: PlayContext): Promise<void> => {
	// Ask Noz is not rendered with Noz off, so there is no panel to open.
	if (!args.noz) {
		return;
	}
	await userEvent.click(
		await screen.findByTestId(
			'bottom-strip-ask-noz-button',
			undefined,
			untilLoaded,
		),
	);
	await screen.findByTestId('ai-assistant-panel-close');
};

/** The icon only shows once the shell has loaded at least one saved conversation. */
export const openNozHistory = async ({ args }: PlayContext): Promise<void> => {
	if (!args.noz || args.nozThreads === 0) {
		return;
	}
	await userEvent.click(
		await screen.findByTestId('noz-history-trigger', undefined, untilLoaded),
	);
	await screen.findByText('Earlier conversations');
};

/** Waits until the thread has stayed scrolled to its end for `HOLD_MS`. */
const expectThreadAtEnd = async (): Promise<void> => {
	await waitFor(
		async () => {
			await expect(gapBelowView()).toBeLessThanOrEqual(1);
			await new Promise((resolve) => {
				setTimeout(resolve, HOLD_MS);
			});
			await expect(gapBelowView()).toBeLessThanOrEqual(1);
		},
		{ timeout: 10_000 },
	);
};

/**
 * Opens the newest tab's chat in the panel, which clears its dot, then switches
 * to the tab before it. Each chat opens on its end, with the last message in full.
 */
export const openNozChatTabs = async ({ args }: PlayContext): Promise<void> => {
	if (!args.noz || args.nozChats === 0) {
		return;
	}
	const tabs = await screen.findAllByTestId(
		/^bottom-strip-noz-chats-.+-open$/,
		undefined,
		untilLoaded,
	);
	await userEvent.click(tabs[tabs.length - 1]);
	await screen.findByTestId('ai-assistant-panel-close');
	await expectThreadAtEnd();
	if (tabs.length < 2) {
		return;
	}
	const previous = tabs[tabs.length - 2];
	await userEvent.click(previous);
	await waitFor(() => expect(previous).toHaveAttribute('aria-current', 'true'));
	await expectThreadAtEnd();
};

/** Raises a toast and waits for it, so the shot is taken with it on screen. */
export const raiseToast = async (): Promise<void> => {
	toast.success('Service account deleted');
	await screen.findByText('Service account deleted', undefined, untilLoaded);
};
