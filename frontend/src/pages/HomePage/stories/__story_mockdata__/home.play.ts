/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent } from 'storybook/test';

import { type HomeArgs, paletteListsHome } from '../HomePage.stories.mocks';

interface PlayContext {
	args: HomeArgs;
}

export const openCommandPalette = async ({
	args,
}: PlayContext): Promise<void> => {
	await userEvent.keyboard('{Meta>}k{/Meta}');
	await screen.findByTestId('cmdk-palette', undefined, { timeout: 10000 });

	if (paletteListsHome(args)) {
		await screen.findByText('Go to Home');
	}
};
