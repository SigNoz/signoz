import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { exceptionsMocks } from './AllErrors.stories.mocks';
import AllErrors from '../index';

type AllErrorsArgs = PageStoryArgs<typeof exceptionsMocks>;

const pageStory = storyMocks(exceptionsMocks, {
	route: ROUTES.ALL_ERROR,
	layout: 'app',
});

/**
 * Exception groups over the period, with the quick filters and the filter panel
 * the explorers share.
 *
 * Route: `/exceptions`.
 */
const meta = {
	title: 'Pages/Exceptions/List',
	tags: ['play'],
	component: AllErrors,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<AllErrorsArgs>;

export default meta;

type Story = StoryObj<AllErrorsArgs>;

/** The page fetches before it renders a row, which outlasts the 1s default. */
const untilLoaded = { timeout: 15_000 };

const openQuickFiltersSettings = async (): Promise<void> => {
	// The settings control renders disabled while its permission check is in
	// flight and is swapped for the enabled one once the check answers, so it is
	// looked up again on every attempt; a click on the disabled one is dropped in
	// silence.
	const control = await waitFor(() => {
		const settings = screen.getByTestId('settings-icon-container');

		expect(settings).not.toHaveAttribute('aria-disabled', 'true');

		return settings;
	}, untilLoaded);

	await userEvent.click(control);
	await screen.findByText('Edit quick filters', undefined, untilLoaded);
};

/**
 * Every exception group in the window: the org's quick filters down the left, the
 * resource filter and the time range above, and the table sorted by application
 * with each type linking to its detail page.
 */
export const Default: Story = {};

/**
 * A workspace with nothing thrown in the window and no quick filters configured,
 * so the table and the filter panel both show their empty states.
 */
export const NoExceptions: Story = {
	args: { exceptions: 0, quickFilters: 0 },
};

/** The query area after the quick-filters panel is collapsed. */
export const FiltersCollapsed: Story = {
	args: { filterPanel: false },
};

/** The table mid-query, with the cancel action the toolbar offers while it runs. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/**
 * What cancelling a running query leaves behind: the table is dropped for a
 * placeholder until Run Query is pressed again.
 */
export const QueryCancelled: Story = {
	args: { dataState: 'loading' },
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			await within(canvasElement).findByText(/cancel/i, undefined, untilLoaded),
		);

		await screen.findByText(/query cancelled/i, undefined, untilLoaded);
	},
};

/** The editable quick-filter settings panel. */
export const QuickFiltersSettings: Story = {
	play: openQuickFiltersSettings,
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

/** Settings with an unsaved filter removal and the fixed action footer. */
export const QuickFiltersSettingsDirty: Story = {
	play: dirtyQuickFiltersSettings,
};

/**
 * The same panel with a banner above the shell. The banner takes 48px off the
 * layout, so this is the case where the footer used to be pushed off screen:
 * the panel is sized from the filters pane rather than the viewport, which
 * keeps Save changes reachable.
 */
export const QuickFiltersSettingsWithBanner: Story = {
	args: { banner: 'trial-expiry' },
	play: dirtyQuickFiltersSettings,
};
