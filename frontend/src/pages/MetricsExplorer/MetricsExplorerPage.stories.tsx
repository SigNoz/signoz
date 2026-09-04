import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { metricsMocks } from './MetricsExplorerPage.stories.mocks';
import MetricsExplorerPage from './MetricsExplorerPage';

type MetricsArgs = PageStoryArgs<typeof metricsMocks>;

const pageStory = storyMocks(metricsMocks);

/**
 * Metrics: the summary treemap, the explorer over `query_range`, the metric drawer
 * with its attributes and related assets, saved views, and the volume control
 * rules.
 *
 * Route: `/metrics-explorer/*`, the tab control picks which.
 */
const meta = {
	title: 'Pages/Metrics/Explorer',
	component: MetricsExplorerPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<MetricsArgs>;

export default meta;

type Story = StoryObj<MetricsArgs>;

/**
 * The Summary tab on a workspace ingesting a full catalogue of metrics: the
 * proportion view sizing each metric against the others, and the list view
 * below it paging ten metrics at a time with their type, unit and cardinality.
 */
export const Default: Story = {};

/**
 * The metric details drawer, opened from a row: the metric's metadata, the
 * cardinality highlights, the dashboards and alerts it feeds, and its attribute
 * keys with the values seen in the window.
 */
export const MetricDetails: Story = {
	args: { drawer: 'details' },
};

/**
 * The inspect modal, which plots the raw time series behind one gauge before any
 * time or space aggregation is applied.
 */
export const Inspect: Story = {
	args: { drawer: 'inspect' },
};

/**
 * The Volume Control tab: what the workspace ingests against what the reduction
 * rules retain, and the rule per metric that decides it.
 */
export const VolumeControl: Story = {
	args: { tab: 'volume-control' },
};

/**
 * The Explorer tab plotting one metric, with the query builder above the chart
 * and the saved-view actions in the toolbar.
 */
export const Explorer: Story = {
	args: { tab: 'explorer' },
};

/** The Views tab, where the saved views the explorer offers are managed. */
export const SavedViews: Story = {
	args: { tab: 'views' },
};

/**
 * A fresh workspace: nothing ingested in the window, so the Summary tab drops
 * both views for its onboarding state and nothing is saved or reduced yet.
 */
export const NoMetrics: Story = {
	args: { metrics: 0, treemap: 0, rules: 0, savedViews: 0 },
};

/** The Summary tab mid-query, with the cancel action the toolbar offers. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};
