/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, within } from 'storybook/test';

import {
	type AttributeMappingArgs,
	canAddMapping,
} from '../AttributeMapping.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: AttributeMappingArgs;
}

export const openAddMappingDrawer = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canAddMapping(args)) {
		return;
	}

	const canvas = within(canvasElement);

	await userEvent.click(
		await canvas.findByTestId('group-expand-group-1', undefined, {
			timeout: 15000,
		}),
	);
	await userEvent.click(
		await canvas.findByRole(
			'button',
			{ name: /add mapping/i },
			{ timeout: 15000 },
		),
	);
	await screen.findByText('New custom mapping');
};
