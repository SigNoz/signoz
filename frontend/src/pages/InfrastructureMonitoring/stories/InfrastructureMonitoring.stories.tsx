import type { Meta, StoryObj } from '@storybook/react-vite';
import { VIEWS } from 'container/InfraMonitoringK8sV2/constants';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';

import { infraMonitoringMocks } from './InfrastructureMonitoring.stories.mocks';

import InfrastructureMonitoringPage from '../InfrastructureMonitoringPage';

type InfraArgs = PageStoryArgs<typeof infraMonitoringMocks>;

const pageStory = storyMocks(infraMonitoringMocks, { layout: 'app' });

/**
 * The host list, and the way into the Kubernetes tabs: the table, its quick
 * filters and the entity drawer.
 *
 * Route: `/infrastructure-monitoring/hosts`.
 */
const meta = {
	title: 'Pages/Infrastructure/Overview',
	component: InfrastructureMonitoringPage,
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

/** An empty range that predates retention, distinct from an uninstrumented fleet. */
export const BeforeRetention: Story = {
	args: { rows: 0, emptyReason: 'before-retention', checks: 'no-checks' },
};

/** The host list remains usable while its query reports a response warning. */
export const QueryWarning: Story = {
	args: { warning: true },
};

/** The selected host's metrics drawer, reached through the route's detail state. */
export const HostDetailsMetrics: Story = {
	args: { drawer: true, drawerTab: VIEWS.METRICS },
};

/** The selected host's logs drawer, including its independently queried rows. */
export const HostDetailsLogs: Story = {
	args: { drawer: true, drawerTab: VIEWS.LOGS },
};

/** The selected host's traces drawer, including its independently queried rows. */
export const HostDetailsTraces: Story = {
	args: { drawer: true, drawerTab: VIEWS.TRACES },
};

/** The table and the drawer widgets mid-load, shell included. */
export const Loading: Story = {
	args: { dataState: 'loading' },
};

/**
 * Every tooltip the host list carries, held open: the Options button above the
 * table, the Hostname, IOWait and load average headers sharing the generic note
 * and its docs link, the Status header's own sentence about the ten minute
 * window, and the CPU, memory and disk headers, whose tooltip is the whole
 * threshold legend rather than a sentence. The Collapse Filters control beside
 * the quick filters is an antd tooltip and stays closed.
 */
export const Tooltips: Story = {
	args: { tooltipsOpen: true },
};
