/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { screen, userEvent, within } from 'storybook/test';

import {
	canManagePricing,
	type ModelPricingArgs,
} from '../ModelPricing.stories.mocks';

interface PlayContext {
	canvasElement: HTMLElement;
	args: ModelPricingArgs;
}

export const openUnpricedModels = async ({
	canvasElement,
}: PlayContext): Promise<void> => {
	await userEvent.click(
		await within(canvasElement).findByRole(
			'tab',
			{ name: /unpriced models/i },
			{ timeout: 15000 },
		),
	);
	await screen.findByRole('tab', { name: /unpriced models/i, selected: true });
};

export const openModelCostDrawerCreate = async ({
	canvasElement,
	args,
}: PlayContext): Promise<void> => {
	if (!canManagePricing(args)) {
		return;
	}
	await userEvent.click(
		await within(canvasElement).findByRole(
			'button',
			{ name: /add model cost/i },
			{ timeout: 15000 },
		),
	);
	await screen.findByTestId('drawer-provider-select');
};
