/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, within } from 'storybook/test';

interface PlayContext {
	canvasElement: HTMLElement;
}

export const openDownloadMenu = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByTestId(
			'download-menu-trigger',
			{},
			{ timeout: 15000 },
		),
	);
	await screen.findByRole('menu');
};
