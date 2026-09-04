import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { meterMocks } from './MeterExplorer.stories.mocks';
import MeterExplorerPage from './MeterExplorerPage';

type MeterArgs = PageStoryArgs<typeof meterMocks>;

const pageStory = storyMocks(meterMocks);

/**
 * What the workspace is metered for, per signal: the explorer over `query_range`,
 * its saved views and the billing notice above them.
 *
 * Route: `/meter/explorer`.
 */
const meta = {
	title: 'Pages/Metering/Cost Meter',
	component: MeterExplorerPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<MeterArgs>;

export default meta;

type Story = StoryObj<MeterArgs>;

/**
 * The Meter tab over the last day: what the workspace ingested in total, then
 * the hourly count and size of log records, of spans, and the metric datapoints
 * behind the bill.
 */
export const Default: Story = {};

/**
 * The Explorer tab with a meter metric staged, so the bar chart, the quick
 * filters and the query builder all show what a saved cost query looks like.
 */
export const Explorer: Story = {
	args: { tab: 'explorer' },
};

/** The Views tab, where the meter queries the workspace has saved are managed. */
export const SavedViews: Story = {
	args: { tab: 'views' },
};

/**
 * A workspace that has not sent telemetry yet: the totals read zero and every
 * section reports no data. Its quick filters and saved views are unset too, so
 * the Explorer and Views tabs are empty from here as well.
 */
export const NoUsage: Story = {
	args: { signals: [], quickFilters: 0, savedViews: 0 },
};

/**
 * A window from the meter's beta phase, which a cloud tenant is warned about
 * because the numbers from before 22 August 2025 are not billable.
 */
export const BeforeMeterLaunch: Story = {
	args: { timeRange: 'august-2025' },
};
