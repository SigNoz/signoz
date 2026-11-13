/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { toast } from '@signozhq/ui/toast';
import { screen, userEvent } from 'storybook/test';

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

/** Raises a toast and waits for it, so the shot is taken with it on screen. */
export const raiseToast = async (): Promise<void> => {
	toast.success('Service account deleted');
	await screen.findByText('Service account deleted', undefined, untilLoaded);
};
