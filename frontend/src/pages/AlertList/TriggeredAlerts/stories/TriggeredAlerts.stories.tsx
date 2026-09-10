import type { Meta, StoryObj } from '@storybook/react-vite';
import { screen, userEvent, within } from 'storybook/test';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import {
	overflowingLabels,
	triggeredAlertsMocks,
} from './TriggeredAlerts.stories.mocks';

import AlertList from '../../index';
import { AlertListTabs } from '../../types';

type TriggeredAlertsArgs = PageStoryArgs<typeof triggeredAlertsMocks>;

const pageStory = storyMocks(triggeredAlertsMocks, { layout: 'app' });

/**
 * Alerts firing now, grouped and filtered from the query string, with severity and
 * state per row.
 *
 * Route: `/alerts?tab=TriggeredAlerts`.
 */
const meta = {
	title: 'Pages/Alerts/Triggered',
	tags: ['play'],
	component: AlertList,
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<TriggeredAlertsArgs>;

export default meta;

type Story = StoryObj<TriggeredAlertsArgs>;

const tab = `/alerts?tab=${AlertListTabs.TRIGGERED_ALERTS}`;

/**
 * The alerts firing right now, newest first, with how long each one has been
 * firing and the labels the rule attached to it.
 */
export const Default: Story = {};

/** Nothing firing, which is the state an on-call engineer wants to see. */
export const NoAlerts: Story = {
	args: { alerts: 0 },
};

/** Search: an unmatched term retains the filters and renders the no-results state. */
export const SearchNoResults: Story = {
	parameters: {
		signoz: { route: `${tab}&search=no-matching-alert` },
	},
};

/** Data: the table's initial loading branch. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/** Data: the retryable error branch when the alert request fails. */
export const LoadError: Story = {
	args: { dataState: 'error' },
};

/**
 * The same alerts collapsed under the service they came from: one row per
 * group, each expanding to the alerts inside it.
 */
export const GroupedByService: Story = {
	parameters: {
		signoz: { route: `${tab}&groupBy=${JSON.stringify(['service'])}` },
	},
};

/**
 * A tag filter narrowing the list to the critical alerts, which is how the tab
 * is read during an incident.
 */
export const FilteredToCritical: Story = {
	parameters: {
		signoz: {
			route: `${tab}&alertFilters=${JSON.stringify(['severity:critical'])}`,
		},
	},
};

/** Interaction: the tag-filter menu is mounted in its portal. */
export const FilterComboboxOpen: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('triggered-alerts-filter-combobox'),
		);
		await screen.findByRole('listbox');
	},
};

/** Interaction: the group-by menu is mounted in its portal. */
export const GroupByComboboxOpen: Story = {
	play: async ({ canvasElement }): Promise<void> => {
		await userEvent.click(
			within(canvasElement).getByTestId('triggered-alerts-groupby-combobox'),
		);
		await screen.findByRole('listbox');
	},
};

/** Interaction: a grouped row expands to its nested alert table. */
export const GroupedExpanded: Story = {
	parameters: {
		signoz: { route: `${tab}&groupBy=${JSON.stringify(['service'])}` },
	},
	play: async (): Promise<void> => {
		const [firstGroup] = await screen.findAllByTestId('group-expand-toggle');

		await userEvent.click(firstGroup);
		// The nested table is what the group opens, and it carries its own count.
		await screen.findByText(/showing 1 - 1 of 1/i);
	},
};

/** Density: four selected severity filters exercise collapsed filter-pill overflow. */
export const ManyFilterPills: Story = {
	parameters: {
		signoz: {
			route: `${tab}&alertFilters=${JSON.stringify([
				'severity:critical',
				'severity:error',
				'severity:warning',
				'severity:info',
			])}`,
		},
	},
};

/**
 * Both tooltips the Labels column has, held open: the badge that fits, which
 * repeats its own `key: value`, and the overflow chip, which lists every label
 * that did not fit as one line. The alerts here carry far more labels than the
 * tab's own fixture, which is why the Triggered alerts, Severity and Alert
 * state controls do not reach this story.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
	parameters: { msw: { handlers: [overflowingLabels] } },
};
