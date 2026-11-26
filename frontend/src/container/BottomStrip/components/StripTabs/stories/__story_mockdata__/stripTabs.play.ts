/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent } from 'storybook/test';

interface PlayContext {
	args: { tabs: number };
}

/** Tabs to the first tab, which shows its × over the end of the label. */
export const focusFirstTab = async ({ args }: PlayContext): Promise<void> => {
	if (args.tabs === 0) {
		return;
	}
	await screen.findByTestId('strip-tabs-tab-0-open');
	await userEvent.tab();
	await expect(screen.getByTestId('strip-tabs-tab-0-open')).toHaveFocus();
	await expect(screen.getByTestId('strip-tabs-tab-0-close')).toBeVisible();
};
