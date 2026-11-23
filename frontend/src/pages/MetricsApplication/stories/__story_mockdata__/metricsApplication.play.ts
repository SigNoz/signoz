/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, waitFor, within } from 'storybook/test';

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

export const openApDexSettings = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	const trigger = await waitFor(
		() => {
			const found = canvasElement.querySelector<HTMLElement>(
				'.ap-dex-settings-popover-content button',
			);

			if (!found) {
				throw new Error('Apdex settings control is not rendered');
			}

			return found;
		},
		{ timeout: 15000 },
	);

	await userEvent.click(trigger);
	await screen.findByText(/apdex threshold/i);
};
