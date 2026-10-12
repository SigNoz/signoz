import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

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

/**
 * A pricing rule saved from its drawer: the toast announcing the update, raised
 * once the PUT answers. Set Rule save to `error` or `loading` to see the drawer
 * instead.
 */
export const ModelCostSavedToast: Story = {
	play: async (context): Promise<void> => {
		await ModelCostDrawer.play?.(context);
		await userEvent.type(
			await screen.findByTestId('drawer-pattern-input'),
			'gpt-4o-2026{Enter}',
		);
		await userEvent.click(await screen.findByTestId('drawer-save-btn'));
		if (context.args.ruleSave === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/model cost .*updated/i)).toBeVisible(),
			);
		}
	},
};

/**
 * A pricing rule deleted from its row menu: the toast announcing it, raised once
 * the DELETE answers. Set Rule delete to `error` for the failure toast.
 */
export const ModelCostDeletedToast: Story = {
	play: async (context): Promise<void> => {
		await ModelCostActionsMenu.play?.(context);
		await userEvent.click(await screen.findByText('Delete'));
		await userEvent.click(await screen.findByTestId('drawer-delete-confirm-btn'));
		if (context.args.ruleDelete === 'success') {
			await waitFor(() =>
				expect(screen.getByText(/model cost .*deleted/i)).toBeVisible(),
			);
		}
	},
};

/** Interaction: the billing model menu of an unpriced model, with its create footer. */
export const UnpricedModelMapToOpen: Story = {
	parameters: {
		signoz: { route: '/ai-observability/configuration?tab=unpriced-models' },
	},
	play: async ({ canvasElement }): Promise<void> => {
		const [trigger] = await within(canvasElement).findAllByTestId(
			/^map-to-select-/,
			{},
			{ timeout: 10000 },
		);
		await userEvent.click(trigger);
		await screen.findAllByTestId(/^map-to-option-/);
	},
};

/**
 * An unpriced model mapped onto an existing billing model: the "Mapped model"
 * toast, or the failure toast when Rule save is `error`.
 */
export const UnpricedModelMappedToast: Story = {
	parameters: {
		signoz: { route: '/ai-observability/configuration?tab=unpriced-models' },
	},
	play: async ({ canvasElement, args }): Promise<void> => {
		const [trigger] = await within(canvasElement).findAllByTestId(
			/^map-to-select-/,
			{},
			{ timeout: 10000 },
		);
		await userEvent.click(trigger);
		const [option] = await screen.findAllByTestId(/^map-to-option-/);
		await userEvent.click(option);
		await userEvent.click(await screen.findByTestId('unpriced-map-confirm-btn'));
		if (args.ruleSave === 'success') {
			await waitFor(() => expect(screen.getByText('Mapped model')).toBeVisible());
		}
	},
};
