/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent } from 'storybook/test';

/** The page fetches before it renders its toolbar, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

export const openAutoRefreshMenu = async (): Promise<void> => {
	await userEvent.click(
		await screen.findByTestId('auto-refresh-trigger', undefined, untilLoaded),
	);
	await screen.findByText('Refresh Interval', undefined, untilLoaded);
};
