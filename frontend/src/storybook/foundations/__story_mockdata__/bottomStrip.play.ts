/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { toast } from '@signozhq/ui/toast';
import { screen, userEvent } from 'storybook/test';

import type { GlobalMockArgs } from '@/storybook/globals';
import { isCloudShell } from '@/storybook/globals/appShellMocks';

/** The shell renders its entry points after the global config and the license settle. */
const untilLoaded = { timeout: 10_000 };

/** Support offers the modal only to a cloud workspace that has no premium support. */
export const openAddCardModal = async ({
	args,
}: {
	args: Pick<GlobalMockArgs, 'support' | 'license' | 'banner'>;
}): Promise<void> => {
	if (args.support !== 'add-card' || !isCloudShell(args)) {
		return;
	}

	await userEvent.click(
		await screen.findByTestId('bottom-strip-support', undefined, untilLoaded),
	);
	await screen.findByRole('dialog', {
		name: /Add Credit Card for Chat Support/i,
	});
};

/** Raises a toast and waits for it, so the shot is taken with it on screen. */
export const raiseToast = async (): Promise<void> => {
	toast.success('Service account deleted');
	await screen.findByText('Service account deleted', undefined, untilLoaded);
};

/** Ask Noz is not rendered with Noz off, so there is no panel to open. */
export const openNozPanel = async ({
	args,
}: {
	args: { noz: boolean };
}): Promise<void> => {
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
