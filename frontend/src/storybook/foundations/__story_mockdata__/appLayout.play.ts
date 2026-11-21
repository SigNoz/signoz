/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen } from 'storybook/test';

/** The changelog modal loads its chunk when it opens, after the shell settles. */
export const waitForChangelog = async (): Promise<void> => {
	await screen.findByTestId('changelog-content', undefined, {
		timeout: 10_000,
	});
};
