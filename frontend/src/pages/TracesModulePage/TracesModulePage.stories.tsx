import type { Meta, StoryObj } from '@storybook/react-vite';
import { ExplorerViews } from 'pages/LogsExplorer/utils';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { tracesMocks } from './TracesModulePage.stories.mocks';
import TracesModulePage from './TracesModulePage';

type TracesArgs = PageStoryArgs<typeof tracesMocks>;

const pageStory = storyMocks(tracesMocks);

/**
 * The traces explorer: the query builder, the span list and its detail drawer,
 * with saved views and funnels as tabs.
 *
 * Route: `/traces-explorer`.
 */
const meta = {
	title: 'Pages/Traces/Explorer',
	component: TracesModulePage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<TracesArgs>;

export default meta;

type Story = StoryObj<TracesArgs>;

/**
 * The Explorer tab on a full window of spans: the org's quick filters down the
 * left, the query builder and the view switcher above, and the list paging ten
 * spans at a time with the failing ones answering 503.
 */
export const Default: Story = {};

/**
 * The Trace view, which shows one row per trace: its root span, the root
 * duration and how many spans the trace has.
 */
export const RootSpans: Story = {
	args: { view: ExplorerViews.TRACE },
};

/** The Funnels tab, listing the funnels the workspace has saved. */
export const Funnels: Story = {
	args: { tab: 'funnels' },
};

/** The Views tab, where the saved views the explorer offers are managed. */
export const SavedViews: Story = {
	args: { tab: 'views' },
};

/**
 * A fresh workspace: nothing ingested in the window and no quick filters
 * configured yet, so the table and the filter panel both show their empty
 * states.
 */
export const NoTraces: Story = {
	args: { spans: 0, quickFilters: 0, savedViews: 0, funnels: 0 },
};

/** The list mid-query, with the cancel action the toolbar offers while it runs. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};
