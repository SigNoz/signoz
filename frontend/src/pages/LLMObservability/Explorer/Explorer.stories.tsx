import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExplorerViews } from 'pages/LogsExplorer/utils';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import LLMObservabilityPage from '../index';
import { llmExplorerMocks } from './Explorer.stories.mocks';

type LLMExplorerArgs = PageStoryArgs<typeof llmExplorerMocks>;

const pageStory = storyMocks(llmExplorerMocks);

/**
 * The AI observability explorer: the traces explorer scoped to LLM spans, with
 * the query builder, the view switcher and the quick filters beside it. The
 * view is driven by the URL, so the control below is what switches it.
 *
 * Route: `/ai-observability/explorer`.
 */
const meta = {
	title: 'Pages/AI Observability/Explorer',
	component: LLMObservabilityPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<LLMExplorerArgs>;

export default meta;

type Story = StoryObj<LLMExplorerArgs>;

/**
 * A full window of LLM spans: the org's quick filters down the left, the query
 * builder and the view switcher above, and the list paging ten spans at a time
 * with the failing ones answering 503.
 */
export const Default: Story = {};

/**
 * The Trace view, which shows one row per trace: its root span, the root
 * duration and how many spans the trace has.
 */
export const RootSpans: Story = {
	args: { view: ExplorerViews.TRACE },
};

/**
 * The time series view, which charts the spans the query matches instead of
 * listing them.
 */
export const TimeSeries: Story = {
	args: { view: ExplorerViews.TIMESERIES },
};

/**
 * A workspace with the SDK wired up but no LLM spans in the window, and no
 * quick filters configured yet, so the list and the filter panel both show
 * their empty states.
 */
export const NoSpans: Story = {
	args: { spans: 0, quickFilters: 0, savedViews: 0 },
};

/** The list mid-query, with the cancel action the toolbar offers while it runs. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};
