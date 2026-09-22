import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import LLMObservabilityPage from '../../index';
import { llmOverviewMocks } from './Overview.stories.mocks';

type LLMOverviewArgs = PageStoryArgs<typeof llmOverviewMocks>;

const pageStory = storyMocks(llmOverviewMocks, { layout: 'app' });

/**
 * The AI observability overview: cost, token and latency panels over
 * `query_range`.
 *
 * Route: `/ai-observability/overview`.
 */
const meta = {
	title: 'Pages/AI Observability/Overview',
	component: LLMObservabilityPage,
	...pageStory,
	// The header's public-dashboard lookup is expected to 404, so every story opts out.
	parameters: { ...pageStory.parameters, allowConsoleErrors: true },
} satisfies Meta<LLMOverviewArgs>;

export default meta;

type Story = StoryObj<LLMOverviewArgs>;

/**
 * The bundled overview dashboard: spend, tokens, latency and errors across
 * every model the workspace calls, scoped by the model, environment and
 * service variables above it.
 */
export const Default: Story = {};

/** A workspace with the SDK wired up but no LLM spans yet. */
export const NoSpans: Story = {
	args: { series: 0 },
};
