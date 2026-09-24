import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import LLMObservabilityPage from '../../index';
import { modelPricingMocks } from './ModelPricing.stories.mocks';

type ModelPricingArgs = PageStoryArgs<typeof modelPricingMocks>;

const pageStory = storyMocks(modelPricingMocks, { layout: 'app' });

/**
 * Per model token pricing, plus the models seen in spans that no rule prices yet.
 *
 * Route: `/ai-observability/configuration`.
 */
const meta = {
	title: 'Pages/AI Observability/Model Pricing',
	tags: ['play'],
	component: LLMObservabilityPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<ModelPricingArgs>;

export default meta;

type Story = StoryObj<ModelPricingArgs>;

/**
 * What every model costs per million tokens, which is what the spend on the
 * overview is computed from.
 */
export const Default: Story = {};

/** Nothing priced yet, with every model the workspace calls still unmatched. */
export const NothingPriced: Story = {
	args: { rules: 0 },
};

/**
 * The first pricing rule's menu, open over the table: edit the rule or drop it.
 */
export const ModelCostActionsMenu: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		const [first] = await within(canvasElement).findAllByRole(
			'button',
			{ name: 'Model cost actions' },
			{ timeout: 10000 },
		);

		await userEvent.click(first);
		await screen.findByRole('menu');
	},
};

/** The first pricing rule's drawer, opened from its row menu. */
export const ModelCostDrawer: Story = {
	play: async (context): Promise<void> => {
		await ModelCostActionsMenu.play?.(context);
		await userEvent.click(await screen.findByText('Edit'));
		await screen.findByText('Edit model cost');
	},
};

/** The drawer with its cache mode select open. */
export const ModelCostDrawerCacheModeOpen: Story = {
	play: async (context): Promise<void> => {
		await ModelCostDrawer.play?.(context);

		await userEvent.click(
			await screen.findByRole('combobox', { name: 'Cache mode' }),
		);
		await screen.findByRole('listbox');
	},
};
