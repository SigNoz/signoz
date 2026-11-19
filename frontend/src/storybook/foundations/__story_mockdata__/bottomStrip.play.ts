/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { toast } from '@signozhq/ui/sonner';
import { screen, userEvent } from 'storybook/test';

import type { GlobalMockArgs } from '../../globals';

interface PlayContext {
	args: GlobalMockArgs;
}

/** The shell renders its entry points after the global config and the license settle. */
const untilLoaded = { timeout: 10_000 };

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

/** Raises a toast and waits for it, so the shot is taken with it on screen. */
export const raiseToast = async (): Promise<void> => {
	toast.success('Service account deleted');
	await screen.findByText('Service account deleted', undefined, untilLoaded);
};
