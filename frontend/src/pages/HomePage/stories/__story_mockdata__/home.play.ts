/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, within } from 'storybook/test';

import { type HomeArgs, paletteListsHome } from '../HomePage.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: HomeArgs;
}

const openNavMenu = async (
	canvasElement: HTMLElement,
	testId: string,
): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(testId, {}, { timeout: 10000 }),
	);
	await screen.findByRole('menu');
};

export const openNavHelpMenu = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openNavMenu(canvasElement, 'help-support-nav-item');
};

export const openNavSettingsMenu = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await openNavMenu(canvasElement, 'settings-nav-item');
};

export const openCommandPalette = async ({
	args,
}: PlayContext): Promise<void> => {
	await userEvent.keyboard('{Meta>}k{/Meta}');
	await screen.findByTestId('cmdk-palette', undefined, { timeout: 10000 });

	if (paletteListsHome(args)) {
		await screen.findByText('Go to Home');
	}
};
