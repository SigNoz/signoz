import type { Meta, StoryObj } from '@storybook/react-vite';

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
