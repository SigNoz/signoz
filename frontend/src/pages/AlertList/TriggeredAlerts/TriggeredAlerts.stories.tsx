import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { triggeredAlertsMocks } from './TriggeredAlerts.stories.mocks';

import AlertList from '../index';
import { AlertListTabs } from '../types';

type TriggeredAlertsArgs = PageStoryArgs<typeof triggeredAlertsMocks>;

const pageStory = storyMocks(triggeredAlertsMocks);

/**
 * Alerts firing now, grouped and filtered from the query string, with severity and
 * state per row.
 *
 * Route: `/alerts?tab=TriggeredAlerts`.
 */
const meta = {
	title: 'Pages/Alerts/Triggered',
	component: AlertList,
	decorators: [withAppLayout],
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
