import type { Meta, StoryObj } from '@storybook/react-vite';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import { withAppLayout } from '@/storybook/decorators/withAppLayout';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { infraMonitoringMocks } from './InfrastructureMonitoring.stories.mocks';

import InfrastructureMonitoringPage from './InfrastructureMonitoringPage';

type InfraArgs = PageStoryArgs<typeof infraMonitoringMocks>;

const pageStory = storyMocks(infraMonitoringMocks);

/**
 * The host list, and the way into the Kubernetes tabs: the table, its quick
 * filters and the entity drawer.
 *
 * Route: `/infrastructure-monitoring/hosts`.
 */
const meta = {
	title: 'Pages/Infrastructure/Overview',
	component: InfrastructureMonitoringPage,
	decorators: [withAppLayout],
	...pageStory,
	parameters: { ...pageStory.parameters },
} satisfies Meta<InfraArgs>;

export default meta;

type Story = StoryObj<InfraArgs>;

/**
 * The Hosts tab with a full page of hosts: quick filters on the left, the status
 * toggle and group-by toolbar above the table, and an instrumentation checks
 * callout reporting an optional metric and a required attribute nobody is
 * sending yet. The Kubernetes tab is the other half of the module, one story per
 * resource under `Kubernetes`.
 */
export const Default: Story = {};

/**
 * Hosts grouped by one attribute: one expandable row per OS, with the active and
 * inactive counts of the hosts behind it.
 */
export const GroupedRows: Story = {
	args: { groupRows: true },
};

/** Nothing reporting yet, which is what a fleet with no collector shows. */
export const NoData: Story = {
	args: { rows: 0, checks: 'no-checks' },
};

/** The table and the drawer widgets mid-load, shell included. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};
