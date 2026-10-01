import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { meterMocks } from './MeterExplorer.stories.mocks';
import MeterExplorerPage from '../MeterExplorerPage';

type MeterArgs = PageStoryArgs<typeof meterMocks>;

const pageStory = storyMocks(meterMocks, { layout: 'app' });

/**
 * What the workspace is metered for, per signal: the explorer over `query_range`,
 * its saved views and the billing notice above them.
 *
 * Routes: `/meter`, `/meter/explorer` and `/meter/explorer/views`.
 */
const meta = {
	title: 'Pages/Metering/Cost Meter',
	tags: ['play'],
	component: MeterExplorerPage,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<MeterArgs>;

export default meta;

type Story = StoryObj<MeterArgs>;

/** The page fetches before it renders its filters, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const openQuickFiltersSettings = async (): Promise<void> => {
	// The settings control renders disabled while its permission check is in
	// flight and is swapped for the enabled one once the check answers, so it is
	// looked up again on every attempt; a click on the disabled one is dropped in
	// silence.
	const control = await waitFor(() => {
		const settings = screen.getByTestId('settings-icon-container');

		expect(settings).toBeEnabled();

		return settings;
	}, untilLoaded);

	await userEvent.click(control);
	await screen.findByText('Edit quick filters', undefined, untilLoaded);
};

const dirtyQuickFiltersSettings = async (): Promise<void> => {
	await openQuickFiltersSettings();

	// One Remove per added filter; the first row's is the one clicked.
	const [removeFilter] = await screen.findAllByRole('button', {
		name: 'Remove',
	});

	await userEvent.click(removeFilter);
	await screen.findByRole('button', { name: 'Save changes' });
};

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

/** The warning shown when the selected window is shorter than one hour. */
export const ShortWindowNotice: Story = {
	args: { timeRange: 'last-30-minutes' },
};

/** The returning-user meter view after the billing notice was dismissed. */
export const BillingNoticeDismissed: Story = {
	args: { billingNotice: false },
};

/** Meter usage where only logs are currently ingesting. */
export const PartialIngestion: Story = {
	args: { signals: ['logs'] },
};

/** The Explorer tab with no quick filters configured. */
export const ExplorerWithoutQuickFilters: Story = {
	args: { tab: 'explorer', quickFilters: 0 },
};

/** The Views tab without any saved meter queries. */
export const ViewsEmpty: Story = {
	args: { tab: 'views', savedViews: 0 },
};

/** The editable quick-filter settings panel, which lives on the Explorer tab. */
export const QuickFiltersSettings: Story = {
	args: { tab: 'explorer' },
	play: openQuickFiltersSettings,
};

/** Settings with an unsaved filter removal and the fixed action footer. */
export const QuickFiltersSettingsDirty: Story = {
	args: { tab: 'explorer' },
	play: dirtyQuickFiltersSettings,
};

/**
 * The same panel with a banner above the shell. The banner takes 48px off the
 * layout, so this is the case where the footer used to be pushed off screen:
 * the panel is sized from the filters pane rather than the viewport, which
 * keeps Save changes reachable.
 */
export const QuickFiltersSettingsWithBanner: Story = {
	args: { tab: 'explorer', banner: 'trial-expiry' },
	play: dirtyQuickFiltersSettings,
};
